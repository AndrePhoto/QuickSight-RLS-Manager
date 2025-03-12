import { generateClient } from "aws-amplify/data";
import { Schema } from "../../amplify/data/resource";
import { qs_fetchDataSets } from "./qs_fetchDataSets";

interface RegionManagerProps {
  region: string;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
}

interface RegionManagerResult {
  status: number;
  message: string;
}

interface RegionParams {
  regionName: string;
  s3BucketName: string;
  glueDatabaseName: string;
  qsDataSource: string;
  availableCapacityInGB: number;
  usedCapacityInGB: number;
  toolCreatedCount: number;
  datasetsCount: number;
  notManageableDatasetsCount: number;
}

const client = generateClient<Schema>();

export const regionSetup = async ({
  region,
  addLog,
}: RegionManagerProps): Promise<RegionManagerResult> => {

  try{
    addLog("===================================================================")
    addLog("Starting Region Initialization: " + region)

    if( region === undefined || region === "" || region === null ){
      addLog("Region is undefined. Skipping.", "WARNING")
      return({ status: 500, message: "Region is undefined. Skipping." })
    }

    // Create ManagedRegion params
    let regionParams = {
      regionName: region,
      s3BucketName: "-",
      glueDatabaseName: "-",
      qsDataSource: "-",
      availableCapacityInGB: 0,
      usedCapacityInGB: 0,
      datasetsCount: 0,
      notManageableDatasetsCount: 0,
      toolCreatedCount: 0
    } as RegionParams

    // Check if Region Exists
    let create = true

    addLog("-----")
    addLog("Checking if Region exists")
    const { data: resRegionExists, errors: errors } = await client.models.ManagedRegion.list({
      filter: {
        regionName: { eq: region }
      }
    })

    if( resRegionExists[0]?.regionName == region ){
      addLog("Region " + region + " already exists. Proceeding to Update.")
      create = false
      regionParams.s3BucketName = resRegionExists[0].s3BucketName
      regionParams.glueDatabaseName = resRegionExists[0].glueDatabaseName
      regionParams.qsDataSource = resRegionExists[0].qsDataSource
      regionParams.availableCapacityInGB = resRegionExists[0].availableCapacityInGB
      regionParams.usedCapacityInGB = resRegionExists[0].usedCapacityInGB
      regionParams.datasetsCount = resRegionExists[0].datasetsCount
      regionParams.notManageableDatasetsCount = resRegionExists[0].notManageableDatasetsCount
      regionParams.toolCreatedCount = resRegionExists[0].toolCreatedCount
    }else if ( errors ){
      addLog("Error checking if Region exists. Skipping.", "ERROR", 500, "GraphQL-GetError")
      return({ status: 500, message: "Error checking if Region exists. Skipping." })
    }else if( resRegionExists == null){
      addLog("Region does not exist. Proceeding to Create.")
      create = true
    }

    if ( create ){
      addLog("Region does not exists. Proceeding to create Region " + region + ".")
      const resCreate = await createRegion(regionParams, true)
      if( resCreate.status != 200 ){
        let errorMessage = "Error creating ManagedRegion. " + resCreate.message
        addLog(errorMessage, "ERROR", resCreate.status, resCreate.message)
        return({ status: 500, message: errorMessage })
      }
    }

    // Create S3 Bucket
    addLog("-----")
    addLog("Checking S3 Bucket")
    if ( regionParams.s3BucketName === '-' ){
      addLog("Bucket does not exists. Proceeding to create the bucket.")
      const resS3Creation = await client.queries.createS3Bucket({region: region})

      if( resS3Creation && resS3Creation.data?.statusCode != 200 ){
        let errorMessage = "Error creating S3 Bucket. " 

        if( resS3Creation.errors && resS3Creation.errors[0].message ){
          errorMessage = errorMessage + resS3Creation.errors[0].message
          if( resS3Creation.errors[0].message === "The provided token is malformed or otherwise invalid." ) {
            errorMessage = "Please check that there are no IAM Policies preventing to correctly use Region: " + region + "."
            addLog(errorMessage, "ERROR", resS3Creation.data?.statusCode, resS3Creation.data?.errorName || "PermissionsError")

            const resRemoveRegion = await client.models.ManagedRegion.delete({ regionName: region })
            addLog("Removing Region: " + region)
            if( resRemoveRegion && resRemoveRegion.errors && resRemoveRegion.errors[0].message ){
              addLog("Failed to remove the Region.")
            }else{
              addLog("Region removed successfully.")
            }
            return({ status: 500, message: errorMessage })
          }
        }
        addLog(errorMessage, "ERROR", resS3Creation.data?.statusCode, resS3Creation.data?.errorName || "Unknown Error")
        return({ status: 500, message: errorMessage })
      }else if ( resS3Creation && resS3Creation.data?.s3BucketName && resS3Creation.data?.s3BucketName != "" ){
        regionParams.s3BucketName = resS3Creation.data?.s3BucketName
        addLog("S3 Bucket created: " + regionParams.s3BucketName)
      }

      addLog("Updating ManagedRegion with S3 Bucket: " + regionParams.s3BucketName + ".")
      const resUpdateBucket = await createRegion(regionParams, false)
      if( resUpdateBucket.status != 200 ){
        let errorMessage = "Error updating ManagedRegion - Step: S3 Bucket. " + resUpdateBucket.message
        addLog(errorMessage, "ERROR", resUpdateBucket.status, resUpdateBucket.message)
        return({ status: 500, message: errorMessage })
      }
    } else {
      addLog("Bucket already exists. Bucket: " + regionParams.s3BucketName + ". Proceeding to next step.")
    }

    // Create Glue Database
    addLog("-----")
    addLog("Checking Glue Database")
    if ( regionParams.glueDatabaseName === '-' ){
      addLog("Glue Database does not exists. Proceeding to create the Glue Database.")
      const resGlueCreation = await client.queries.createGlueDatabase({region: region})

      if( resGlueCreation && resGlueCreation.data?.statusCode != 200 ){
        let errorMessage = "Error creating Glue Database. "
        if( resGlueCreation.errors && resGlueCreation.errors[0].message ){
          errorMessage = errorMessage + resGlueCreation.errors[0].message
        }
        addLog(errorMessage, "ERROR", resGlueCreation.data?.statusCode, resGlueCreation.data?.errorName || "Unknown Error")
        return({ status: 500, message: errorMessage })
      }else if ( resGlueCreation && resGlueCreation.data?.glueDatabaseName && resGlueCreation.data?.glueDatabaseName != "" ){
        regionParams.glueDatabaseName = resGlueCreation.data?.glueDatabaseName
        addLog("Glue Database created: " + regionParams.glueDatabaseName)
      }

      addLog("Updating ManagedRegion with Glue DataBase: " + regionParams.glueDatabaseName + ".")
      const resUpdateGlue = await createRegion(regionParams, false)
      if( resUpdateGlue.status != 200 ){
        let errorMessage = "Error updating ManagedRegion - Step: Glue Database. " + resUpdateGlue.message
        addLog(errorMessage, "ERROR", resUpdateGlue.status, resUpdateGlue.message)
        return({ status: 500, message: errorMessage })
      }
    } else {
      addLog("Glue Database already exists. Glue Database: " + regionParams.glueDatabaseName + ". Proceeding to next step.")
    }

    // Create QuickSight DataSource
    addLog("-----")
    addLog("Checking QuickSight DataSource")
    if ( regionParams.qsDataSource === '-' ){
      addLog("QuickSight DataSource does not exists. Proceeding to create the DataSource.")
      const resQsDataSource = await client.queries.createQSDataSource({region: region})

      if( resQsDataSource && resQsDataSource.data?.statusCode != 200 ){
        let errorMessage = "Error creating QuickSight DataSource. "
        if( resQsDataSource.errors && resQsDataSource.errors[0].message ){
          errorMessage = errorMessage + resQsDataSource.errors[0].message
        }
        addLog(errorMessage, "ERROR", resQsDataSource.data?.statusCode, resQsDataSource.data?.errorName || "Unknown Error")
        return({ status: 500, message: errorMessage })
      }else if ( resQsDataSource && resQsDataSource.data?.qsDataSourceName && resQsDataSource.data?.qsDataSourceName != "" ){
        regionParams.qsDataSource = resQsDataSource.data?.qsDataSourceName
        addLog("QuickSight DataSource created: " + regionParams.qsDataSource)
      }

      addLog("Updating ManagedRegion with QuickSight DataSource: " + regionParams.qsDataSource + ".")
      const resUpdateQsDataSource = await createRegion(regionParams, false)
      if( resUpdateQsDataSource.status != 200 ){
        let errorMessage = "Error updating ManagedRegion - Step: QuickSight DataSource. " + resUpdateQsDataSource.message
        addLog(errorMessage, "ERROR", resUpdateQsDataSource.status, resUpdateQsDataSource.message)
        return({ status: 500, message: errorMessage })
      }

    } else {
      addLog("QuickSight DataSource already exists. DataSource: " + regionParams.qsDataSource + ". Proceeding to next step.")
    }

    
    // Fetch QuickSight DataSets
    addLog("-----")
    addLog("Checking Quicksight DataSets")
    const resDataSets = await qs_fetchDataSets({ region: region, addLog: addLog })

    if( resDataSets && resDataSets.status == 200 ){
      addLog("Setting DataSet Counters")
      regionParams.datasetsCount = resDataSets.datasetsCount
      regionParams.notManageableDatasetsCount = resDataSets.notManageableDatasetsCount
      regionParams.toolCreatedCount = resDataSets.toolCreatedCount
    }else if (resDataSets && resDataSets.status == 404){
      addLog("No DataSets Found. Setting counters to 0.")
      regionParams.datasetsCount = 0
      regionParams.notManageableDatasetsCount = 0
      regionParams.toolCreatedCount = 0
    }else{
      throw new Error(resDataSets.message)
    }

    const resUpdateDataSets = await createRegion(regionParams, false)
    if( resUpdateDataSets.status != 200 ){
      let errorMessage = "Error updating ManagedRegion - Step: Datasets. " + resUpdateDataSets.message
      addLog(errorMessage, "ERROR", resUpdateDataSets.status, resUpdateDataSets.message)
      return({ status: 500, message: errorMessage })
    }

    // QuickSight SPICE Capacity
    addLog("-----")
    addLog("Checking Region SPICE Capacity")
    const resSpice = await client.queries.getQSSpiceCapacity({region: region})

    if( resSpice && resSpice.data?.statusCode == 200 ){
      addLog("QuickSight SPICE Available Capacity: " + resSpice.data?.availableCapacityInGB + " GB")
      addLog("QuickSight SPICE Used Capacity: " + resSpice.data?.usedCapacityInGB + " GB")
      regionParams.availableCapacityInGB = resSpice.data?.availableCapacityInGB || regionParams.availableCapacityInGB
      regionParams.usedCapacityInGB = resSpice.data?.usedCapacityInGB || regionParams.usedCapacityInGB
    }else{
      let errorMessage = "Error fetching QuickSight SPICE Capacity. " + resSpice.data?.message
      addLog(errorMessage, "ERROR", resSpice.data?.statusCode, resSpice.data?.errorName || "Unknown Error")
      return({ status: 500, message: errorMessage })
    }

    const resUpdateSpice = await createRegion(regionParams, false)
    if( resUpdateSpice.status != 200 ){
      let errorMessage = "Error updating ManagedRegion - Step: SPICE. " + resUpdateSpice.message
      addLog(errorMessage, "ERROR", resUpdateSpice.status, resUpdateSpice.message)
      return({ status: 500, message: errorMessage })
    }

    return({ status: 200, message: "YAIII" }) // TODO

  }catch(err){

    return({ status: 500, message: (err as Error).message })

  }finally{

  }


}

const createRegion = async (params: RegionParams, create: boolean) => {

  if( create ){
    const {data: response, errors: errors} = await client.models.ManagedRegion.create( params )

    if( errors || response == undefined ){
      return({ status: 500, message: "Error creating ManagedRegion. " + JSON.stringify(errors, null, 2) })
    }else{
      return({ status: 200, message: "ManagedRegion created." })
    }
  }else{
    const {data: response, errors: errors} = await client.models.ManagedRegion.update( params )

    if( errors || response == undefined ){
      return({ status: 500, message: "Error updating ManagedRegion. " + JSON.stringify(errors, null, 2) })
    }else{
      return({ status: 200, message: "ManagedRegion updated." })
    }
  }

}
