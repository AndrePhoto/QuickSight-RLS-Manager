import { generateClient } from "aws-amplify/data";
import { Schema } from "../../amplify/data/resource";

interface DatasetManagerProps {
  region: string;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
  isFirstInit?: boolean;
}

interface DatasetManagerResult {
  status: number;
  message: string;
  notManageableDatasetsCount: number;
  datasetsCount: number;
  toolCreatedCount: number;
}

const enum RLSStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED'
}

const client = generateClient<Schema>();

export const qs_fetchDataSets = async ({
  region,
  addLog,
  isFirstInit = false,
}: DatasetManagerProps): Promise<DatasetManagerResult> => {

  try {
    let nextToken = undefined
    let apiCallsCount = 1
    let datasetsCount = 0
    let unmanageableDatasetsCount = 0
    let toolCreatedCount = 0

    // If it's not the first initialization, retrieve all the datasets to check if someone has to be deleted.
    let datasetsToDelete: {
      dataSetArn: string;
      toolCreated: boolean;
      rlsToolManaged: boolean;
    }[] = [];

    addLog("Starting Datasets Initialization")

    if( ! isFirstInit ){
      const {data: resDatasetList, errors} = await client.models.DataSet.list(
        { selectionSet: ['dataSetArn', 'toolCreated', 'rlsToolManaged'], filter: { "dataSetRegion": { "eq": region } } } )
      if(errors) {
        const errorMessage = "Failed to fetch DataSets from RLS Tool Data. " + JSON.stringify(errors, null, 2)
        addLog(errorMessage, "ERROR", 500, "GraphQL-ListQueryFailed")
        return { status: 500, message: errorMessage, notManageableDatasetsCount: 0, datasetsCount: 0, toolCreatedCount: 0 }
      }else if( resDatasetList != null){
        if(resDatasetList.length == 0){
          addLog("No DataSet found in RLS Tool Data.")
        }else{
          addLog("DataSets saved in RLS Tool Data: " + resDatasetList.length.toString()) + ". Checking if there are changes."
          for (const dataset of resDatasetList) {
            datasetsToDelete.push({
              dataSetArn: dataset.dataSetArn,
              toolCreated: dataset.toolCreated,
              rlsToolManaged: dataset.rlsToolManaged
            });
          }
        }
      }
    } // END: List DataSets from RLS Tool

    do {
      addLog("Calling QuickSight API ListDataSetsCommand, iteration: " + apiCallsCount.toString())
      const resQsDatasetList = await client.queries.fetchDataSetsFromQS({
        region: region,
        nextToken: nextToken
      })

      if( resQsDatasetList && resQsDatasetList.data?.datasetsList && resQsDatasetList.data.statusCode == 200 ){
        addLog("Saving the retrieved DataSets in the QuickSight RLS Tool.")
        const datasetsList = JSON.parse(resQsDatasetList.data.datasetsList)

        for( const dataset of datasetsList ){
          addLog("")
          // Check if dataset has RLS enabled
          const rlsEnabled = dataset.RowLevelPermissionDataSet?.Status === 'ENABLED'
            ? RLSStatus.ENABLED 
            : RLSStatus.DISABLED;

          // Determine RLS dataset ID without useState
          const rlsDataSetId = dataset.RowLevelPermissionDataSet?.Arn || '';

          // Fetching DataSet Fields
          const resQsDataSetFields = await client.queries.fetchDataSetFieldsFromQS({
            region: region,
            dataSetId: dataset.DataSetId
          })

          let dataSetFields = []
          let apiManageable = true
          let spiceUsedCapacityDataSet = 0

          if( resQsDataSetFields && resQsDataSetFields.data?.datasetsFields && resQsDatasetList.data.statusCode == 200 ){
            const data = JSON.parse(resQsDataSetFields.data.datasetsFields)
            dataSetFields = JSON.parse(resQsDataSetFields.data.datasetsFields)
            apiManageable = true
            spiceUsedCapacityDataSet = data.spiceCapacity
            addLog("DataSet Fields successfully fetched for DataSet '" + dataset.Name + "' with DataSetId: " + dataset.DataSetId)
          }else if( resQsDataSetFields && resQsDataSetFields.data?.statusCode == 999 ){
            // TODO ADD CHECK THAT ERROR MESSAGE IS EXACTLY THE CORRECT ONE
            apiManageable = false
            dataSetFields = []
            addLog("DataSet " + dataset.Name + " is not manageable through APIs", "WARNING")
          } else {
            const errorMessage = "Error fetching DataSets Fields from QuickSight API. Skipping Dataset. Retry later. " + JSON.stringify(resQsDatasetList.errors, null, 2)
            addLog("Attempting to fetch fields for Dataset " + dataset.DataSetId + "failed. Trying to save the Dataset anyway without Fields. Try again later. ", "WARNING")
            addLog("Error Message: " + errorMessage, "ERROR", 500, "GenericError")
          }

          let datasetParams = {
            name: dataset.Name,
            dataSetArn: dataset.Arn,
            dataSetId: dataset.DataSetId, 
            rlsEnabled: rlsEnabled, 
            rlsDataSetId: rlsDataSetId, 
            createdTime: dataset.CreatedTime, 
            importMode: dataset.ImportMode, 
            lastUpdatedTime: dataset.LastUpdatedTime, 
            dataSetRegion: region,
            fields: dataSetFields,
            apiManageable: apiManageable,   
            toolCreated: false,
            spiceCapacityInBytes: spiceUsedCapacityDataSet,
            rlsToolManaged: false
          }
          
          // If the dataset exists in the list to delete, remove it from the delete list and update it.
          let matchingDataset = datasetsToDelete.find(item => item.dataSetArn === dataset.Arn)
          if (matchingDataset){
            datasetsToDelete = datasetsToDelete.filter(item => item.dataSetArn !== dataset.Arn);
            
            datasetParams.toolCreated = matchingDataset.toolCreated;
            if( matchingDataset.toolCreated ){
              toolCreatedCount += 1
            }

            if(rlsEnabled == RLSStatus.ENABLED){
              // addLog("rlsEnabled is true, I keep the existing rlsToolManaged value.")
              datasetParams.rlsToolManaged = matchingDataset.rlsToolManaged;
            }else{
              // addLog("rlsEnabled is false, rlsToolManaged must be false.")
              datasetParams.rlsToolManaged = false
            }
            

            const { data: response_updateDataset, errors: errors } = await client.models.DataSet.update( datasetParams )
            if( response_updateDataset?.name == dataset.Name ){
              addLog(`Dataset "${dataset.Name}" already exists. Successfully updated.`)
            }else{
              console.log(errors)
              addLog(`Dataset "${dataset.Name}" failed to update.`, "ERROR", 500, "GraphQL-UpdateQueryError")
              continue
            }
          } else {
            // If the dataset does not exists, create it. 
            const { data: response_createUser, errors: errors } = await client.models.DataSet.create( datasetParams )
            if( response_createUser?.name == dataset.Name ){
              addLog(`Dataset "${dataset.Name}" successfully saved.`)
            }else{
              addLog(`Dataset "${dataset.Name}" failed to save.`, "ERROR")
              console.log(errors)
              continue
            }
          }

          if( !apiManageable ){
            unmanageableDatasetsCount += 1
          }else{
            datasetsCount += 1
          }

        }

        // Pagination
        nextToken = resQsDatasetList.data.nextToken
        if( nextToken ){
          apiCallsCount++
          addLog("QuickSight API ListDataSetsCommand, nextToken found: ", nextToken)
        }else{
          addLog("QuickSight API ListDataSetsCommand, no nextToken found. ")
        }

      }else{

        const errorMessage = "Error fetching DataSetsList from QuickSight API. " + JSON.stringify(resQsDatasetList.errors, null, 2)
        addLog(errorMessage, "ERROR", 500, "ListDatasetsCommandError")
        addLog(resQsDatasetList.data?.message || "Generic Error", "ERROR", 500, resQsDatasetList.data?.errorName || "Generic Error")
        throw new Error(errorMessage);

      }

    }while(nextToken)

    if( datasetsCount + unmanageableDatasetsCount == 0){
      addLog("No QuickSight Datasets found. Please create a Dataset in QuickSight and try again.", "WARNING");
      return({ status: 404, message: "No datasets found", notManageableDatasetsCount: 0, datasetsCount: 0, toolCreatedCount: 0 })
    } else {
      addLog(`QuickSight manageable Datasets successfully fetched. Dataset found: ${datasetsCount.toString()}`)
      addLog(`QuickSight Datasets not manageable through APIs successfully fetched. Dataset found: ${unmanageableDatasetsCount.toString()}`)
      addLog(`QuickSight Datasets created with RLS Manager found: ${toolCreatedCount.toString()}`)
    }

    // If there are datasets to delete, delete them.
    if( datasetsToDelete.length > 0){
      addLog(`Deleting ${datasetsToDelete.length} Datasets that are not in QuickSight anymore.`)
      for( const datasetCheck of datasetsToDelete ){
        const {data: response_deleteDataset, errors } = await client.models.DataSet.delete({dataSetArn: datasetCheck.dataSetArn})
        if( response_deleteDataset?.dataSetArn == datasetCheck.dataSetArn ){
          addLog(`Dataset "${datasetCheck.dataSetArn}" successfully deleted.`)
        }else{
          addLog(`Dataset "${datasetCheck.dataSetArn}" failed to delete.`, "ERROR", 500, "GraphQL-DeleteQueryError")
          if(errors) addLog(errors[0].message, "ERROR")
          continue
        }
      }
    } else {
      addLog("No Dataset to delete.")
    }

    return({ status: 200, message: "DataSets successfully fetched", notManageableDatasetsCount: unmanageableDatasetsCount, datasetsCount: datasetsCount, toolCreatedCount: toolCreatedCount })

    }catch(err){

      return({ status: 500, message: (err as Error).message, notManageableDatasetsCount: 0, datasetsCount: 0, toolCreatedCount: 0 })

    }
}