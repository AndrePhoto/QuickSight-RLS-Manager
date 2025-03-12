import { generateClient } from "aws-amplify/data";
import { Schema } from "../../amplify/data/resource";
import { StepStatus } from '../hooks/STEP_STATUS'

interface PermissionsManagerProps {
  region: string;
  s3BucketName: string;
  glueDatabaseName: string;
  qsDataSourceName: string;
  csvOutput: string;
  dataSetId: string;
  dataSetArn: string;
  rlsDataSetId: string;
  rlsToolManaged: boolean;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
  setStep: (step: string, stepStatus: StepStatus) => void;
}

interface IngestionManagerProps {
  region: string;
  dataSetArn: string;
  ingestionId: string;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
}

interface FunctionManagerResult {
  status: number;
  message: string;
  errorType? : string
}

const enum RLSStatus {
  ENABLED = 'ENABLED',
  DISABLED = 'DISABLED'
}

const client = generateClient<Schema>();

const qsDataSetIngestionCheck = async({
  region,
  dataSetArn,
  ingestionId,
  addLog
}: IngestionManagerProps): Promise<FunctionManagerResult> => {

  let ingestionStatus = "RUNNING"

  try{
    do{
      addLog("Waiting 5 seconds...")
      await new Promise(resolve => setTimeout(resolve, 5000));
  
      const quickSightIngestionResponse = await client.queries.publishRLS99QsCheckIngestion({
        datasetRegion: region,
        dataSetId: dataSetArn,
        ingestionId: ingestionId
      })

      if(quickSightIngestionResponse.data?.statusCode == 200){
        addLog("RLS DataSet Ingestion Completed.")
        ingestionStatus = "COMPLETED"
      }else if(quickSightIngestionResponse.data?.statusCode == 201){
        addLog("RLS DataSet Ingestion still running...")
        ingestionStatus = "RUNNING"
      }else{
        if(quickSightIngestionResponse.data?.statusCode && quickSightIngestionResponse.data?.message && quickSightIngestionResponse.data?.errorType){
          return{
            status: quickSightIngestionResponse.data.statusCode,
            message: quickSightIngestionResponse.data.message,
            errorType: quickSightIngestionResponse.data.errorType
          }
        }else if(quickSightIngestionResponse.errors){
          for(const error of quickSightIngestionResponse.errors) {
            addLog(error.errorInfo + " - " + error.message, "ERROR", 500, error.errorType)
          }
          throw new Error(quickSightIngestionResponse.errors[0].message);
        }else{
          console.log(quickSightIngestionResponse)
          throw new Error("Unknown error in DataSet ingestion. Please check the logs for more details.");
        }
      }

    }while(ingestionStatus != "COMPLETED")

    return {
      status: 200,
      message: "DataSet Ingestion Completed"
    }

  }catch(e){
    const error = e as Error
    return {
      status: 500,
      errorType: "UnknownError",
      message: error.message,
    };
  }
}

export const publishQSRLSPermissions = async ({
  region,
  s3BucketName,
  glueDatabaseName,
  qsDataSourceName,
  csvOutput,
  dataSetId,
  dataSetArn,
  rlsDataSetId,
  rlsToolManaged,
  addLog,
  setStep
}: PermissionsManagerProps): Promise<FunctionManagerResult> => {

  /**
   * Check Variables
   */
  if( region == undefined || dataSetId == undefined || dataSetArn == undefined ){
    throw new Error("No region or dataset selected");
  }

  if( s3BucketName == undefined || s3BucketName === "-" ){
    throw new Error("No S3 Bucket defined for the selected region. Please check the Global Settings page");
  }
  if( glueDatabaseName == undefined || glueDatabaseName === "-"){
    throw new Error("No Glue Database defined for the selected region. Please check the Global Settings page");
  }
  if( qsDataSourceName == undefined || qsDataSourceName === "-"){
    throw new Error("No QuickSight DataSource defined for the selected region. Please check the Global Settings page");
  }

  addLog("Launching the RLS Lambda. This might take a couple of minutes...")
  addLog("===================================================================")

  /**
   * RLS Tool Resources Validation
   */

  setStep("step0", StepStatus.LOADING)
  addLog("Validating RLS Tool Resources")

  try{
    const publishRLSStep00_ResourcesValidation = await client.queries.publishRLS00ResourcesValidation({
      region: region,
      s3BucketName: s3BucketName,
      glueDatabaseName: glueDatabaseName,
      qsDataSourceName: qsDataSourceName
    })

    if(publishRLSStep00_ResourcesValidation && publishRLSStep00_ResourcesValidation.data?.statusCode == 200 && publishRLSStep00_ResourcesValidation.data?.message){
      addLog(publishRLSStep00_ResourcesValidation.data?.message)
      setStep("step0", StepStatus.SUCCESS)
    }else{
      addLog("Error validating RLS Resources. Please check the logs for more details.", "ERROR", 500, "ResourcesValidationError")
      if(publishRLSStep00_ResourcesValidation.data?.statusCode && publishRLSStep00_ResourcesValidation.data?.message && publishRLSStep00_ResourcesValidation.data?.errorType){
        setStep("step0", StepStatus.ERROR)
        return{
          status: publishRLSStep00_ResourcesValidation.data?.statusCode,
          message: publishRLSStep00_ResourcesValidation.data?.message,
          errorType: publishRLSStep00_ResourcesValidation.data?.errorType
        }
      }else if(publishRLSStep00_ResourcesValidation.errors){
        for(const error of publishRLSStep00_ResourcesValidation.errors) {
          addLog(error.errorInfo + " - " + error.message, "ERROR", 500, error.errorType)
        }
        throw new Error(publishRLSStep00_ResourcesValidation.errors[0].message);
      }else{
        throw new Error("Unknown error validating RLS Resources. Please check the logs for more details.");
      }
    }

  }catch(e){
    const error = e as Error
    setStep("step0", StepStatus.ERROR)
    addLog("Error validating RLS Resources. " + error.message, "ERROR", 500, "UnknownError")
    return {
      status: 500,
      errorType: "UnknownError",
      message: error.message,
    };
  }

  /**
   * S3
   */

  addLog("===================================================================")
  setStep("step1", StepStatus.LOADING)
  // let csvColumns be an array of strings
  let csvColumns: string[] = [];

  addLog("Uploading new CSV file to S3.")
  try{
    const publishRLSStep01_S3 = await client.queries.publishRLS01S3({
      region: region,
      dataSetId: dataSetId,
      csvContent: csvOutput,
      csvHeaders: csvOutput.split("\n")[0].split(","),
      s3BucketName: s3BucketName,
    })

    if(publishRLSStep01_S3 && publishRLSStep01_S3.data?.statusCode == 200 && publishRLSStep01_S3.data?.message){
      csvColumns = publishRLSStep01_S3.data.csvColumns.filter((column): column is string => 
        column !== null && column !== undefined )

      if(csvColumns.length == 0){
        addLog("No valid columns found in the CSV file", "ERROR", 404, "NoValidColumnsFound")
        setStep("step1", StepStatus.ERROR)
        return{
          status: 404,
          message: "No valid columns found in the CSV file",
          errorType: "NoValidColumnsFound"
        }
      } 

      addLog(publishRLSStep01_S3.data?.message)
      setStep("step1", StepStatus.SUCCESS)
    }else{
      addLog("Error uploading CSV file to S3. Please check the logs for more details.", "ERROR", 500, "S3UploadError")
      if(publishRLSStep01_S3.data?.statusCode && publishRLSStep01_S3.data?.message && publishRLSStep01_S3.data?.errorType){
        setStep("step1", StepStatus.ERROR)
        return{
          status: publishRLSStep01_S3.data?.statusCode,
          message: publishRLSStep01_S3.data?.message,
          errorType: publishRLSStep01_S3.data?.errorType
        }
      }else if(publishRLSStep01_S3.errors){
        let fullError = ""
        for(const error of publishRLSStep01_S3.errors) {
          addLog(error.errorInfo + " - " + error.message, "ERROR", 500, error.errorType)
          fullError += error.errorType + ": " + error.errorInfo + " - " + error.message
        }
        return{
          status: 500,
          message: fullError,
          errorType: publishRLSStep01_S3.errors[0].errorType
        }
      }else{
        throw new Error("Unknown error uploading CSV file to S3. Please check the logs for more details.");
      }
    }
  }catch(e){
    const error = e as Error
    setStep("step1", StepStatus.ERROR)
    return {
      status: 500,
      errorType: "UnknownError",
      message: error.message,
    };
  }

  /**
   * Glue
   */

  addLog("===================================================================")
  setStep("step2", StepStatus.LOADING)
  
  addLog("Creating / Updating Glue Table.")

  try{
    const publishRLSStep02_Glue = await client.queries.publishRLS02Glue({
      region: region,
      dataSetId: dataSetId,
      s3BucketName: s3BucketName,
      glueDatabaseName: glueDatabaseName,
      csvColumns: csvColumns
    })

    if(publishRLSStep02_Glue && publishRLSStep02_Glue.data?.statusCode == 200 && publishRLSStep02_Glue.data?.message){
      addLog(publishRLSStep02_Glue.data?.message)
      setStep("step2", StepStatus.SUCCESS)
    }else{
      addLog("Error Creating or Updating the Glue Table. Please check the logs for more details.", "ERROR", 500, "GlueTableUpdateError")
      if(publishRLSStep02_Glue.data?.statusCode && publishRLSStep02_Glue.data?.message && publishRLSStep02_Glue.data?.errorType){
        setStep("step2", StepStatus.ERROR)
        return{
          status: publishRLSStep02_Glue.data?.statusCode,
          message: publishRLSStep02_Glue.data?.message,
          errorType: publishRLSStep02_Glue.data?.errorType
        }
      }else if(publishRLSStep02_Glue.errors){
        setStep("step2", StepStatus.ERROR)
        let fullError = ""
        for(const error of publishRLSStep02_Glue.errors) {
          addLog(error.errorInfo + " - " + error.message, "ERROR", 500, error.errorType)
          fullError += error.errorType + ": " + error.errorInfo + " - " + error.message
        }
        return{
          status: 500,
          message: fullError,
          errorType: publishRLSStep02_Glue.errors[0].errorType
        }
      }else{
        throw new Error("Unknown error Creating or Updating the Glue Table. Please check the logs for more details.");
      }
    }

  }catch(e){
    const error = e as Error
    setStep("step2", StepStatus.ERROR)
    return {
      status: 500,
      errorType: "UnknownError",
      message: error.message,
    };
  }

  addLog("Glue Table created / updated successfully.")

  /**
   * QuickSight
   */
  addLog("===================================================================")
  setStep("step3", StepStatus.LOADING)

  addLog("Creating / Updating QuickSight Row Level Security DataSet.")

  let rlsDataSetArn = ""
  let ingestionId = ""

  try{
    if(rlsDataSetId == undefined || rlsDataSetId == null || rlsDataSetId === "" ){
      addLog("No previous RLS DataSet set for DataSet to be Secured with ID:" + dataSetId + ". Proceeding to create a new RLS DataSet.")
    }else{
      addLog("RLS DataSet ARN indicated in RLS Tool: " + rlsDataSetId + ". Checking also if really exists.")
    }
    
    const publishRLSStep03_QuickSight = await client.queries.publishRLS03QsRLSDataSet({
      region: region,
      dataSetId: dataSetId,
      glueDatabaseName: glueDatabaseName,
      csvColumns: csvColumns,
      qsDataSourceName: qsDataSourceName,
      rlsToolManaged: rlsToolManaged,
      rlsDataSetArn: rlsDataSetId,
    })

    if(publishRLSStep03_QuickSight && publishRLSStep03_QuickSight.data?.statusCode == 200 && publishRLSStep03_QuickSight.data?.message){
      // HTTP 200 --> RLS DataSet Created
      if(publishRLSStep03_QuickSight.data?.rlsDataSetArn){
        rlsDataSetArn = publishRLSStep03_QuickSight.data.rlsDataSetArn
        addLog("RLS DataSet ARN after checks: " + rlsDataSetArn)
      }else{
        console.error(publishRLSStep03_QuickSight)
        addLog("The Lambda returned an empty RLS Arn.", "ERROR", 404, "MissingReturnValues")
        setStep("step3", StepStatus.ERROR)
        throw new Error("The Lambda returned an empty RLS Arn.");
      }
      addLog(publishRLSStep03_QuickSight.data?.message)
      setStep("step3", StepStatus.SUCCESS)
    }else if(publishRLSStep03_QuickSight && publishRLSStep03_QuickSight.data?.statusCode == 201 && publishRLSStep03_QuickSight.data?.message){
      // HTTP 201 --> RLS DataSet Creation RUNNING
      if(publishRLSStep03_QuickSight.data?.rlsDataSetArn && publishRLSStep03_QuickSight.data?.ingestionId){
        rlsDataSetArn = publishRLSStep03_QuickSight.data.rlsDataSetArn
        addLog("RLS DataSet ARN after checks: " + rlsDataSetArn)
        ingestionId = publishRLSStep03_QuickSight.data.ingestionId
      }else{
        console.error(publishRLSStep03_QuickSight)
        addLog("The Lambda returned an empty RLS Arn or Ingestion ID.", "ERROR", 404, "MissingReturnValues")
        setStep("step3", StepStatus.ERROR)
        throw new Error("The Lambda returned an empty RLS Arn.");
      }

      // Ingestion Check
      addLog(publishRLSStep03_QuickSight.data.message)
      addLog("Checking RLS DataSet Ingestion Status...")

      const ingestionRespone = await qsDataSetIngestionCheck({
        region: region,
        dataSetArn: rlsDataSetArn,
        ingestionId: ingestionId,
        addLog
      })

      if(ingestionRespone && ingestionRespone.status == 200 && ingestionRespone.message){
        addLog(ingestionRespone.message)
        addLog("RLS DataSet created/updated successfully.")
      }else{
        setStep("step3", StepStatus.ERROR)
        return{
          status: ingestionRespone.status || 500,
          message: ingestionRespone.message || "Unknown Error on Ingestion Check",
          errorType: ingestionRespone.errorType || "UnknownError"
        }
      }

    }else{
      addLog("Error Creating or Updating the RLS DataSet. Please check the logs for more details.", "ERROR", 500, "RLSDataSetError")
      if(publishRLSStep03_QuickSight.data?.statusCode && publishRLSStep03_QuickSight.data?.message && publishRLSStep03_QuickSight.data?.errorType){
        setStep("step3", StepStatus.ERROR)
        return{
          status: publishRLSStep03_QuickSight.data.statusCode,
          message: publishRLSStep03_QuickSight.data.message,
          errorType: publishRLSStep03_QuickSight.data.errorType
        }
      }else if(publishRLSStep03_QuickSight.errors){
        setStep("step3", StepStatus.ERROR)
        let fullError = ""
        for(const error of publishRLSStep03_QuickSight.errors) {
          addLog(error.errorInfo + " - " + error.message, "ERROR", 500, error.errorType)
          fullError += error.errorType + ": " + error.errorInfo + " - " + error.message
        }
        return{
          status: 500,
          message: fullError,
          errorType: publishRLSStep03_QuickSight.errors[0].errorType
        }
      }else{
        setStep("step3", StepStatus.ERROR)
        throw new Error("Error Creating or Updating the RLS DataSet. Please check the logs for more details.");
      }
    }
  }catch(e){
    const error = e as Error
    setStep("step3", StepStatus.ERROR)
    return {
      status: 500,
      errorType: "UnknownError",
      message: error.message,
    };
  }

  try{
    // Update or Create the RLS DataSet
    addLog("Creating / Updating RLS DataSet in RLS Manager.")
      
    // Check if RLS DataSet already exists
    const rlsDataSetExists = await client.models.DataSet.list({
      filter: {
        dataSetArn: {
          eq: rlsDataSetArn
        }
      }
    })

    let create = false

    if( rlsDataSetExists.data.length > 0 ){
      create = false
    }else if (rlsDataSetExists.data.length == 0){
      create = true
    }else if(rlsDataSetExists.errors){
      addLog('Error checking if RLS DataSet exists. ' + rlsDataSetExists.errors[0].message, "ERROR", 500, "GraphQLError")
      setStep("step3", StepStatus.ERROR)
      throw new Error(rlsDataSetExists.errors[0].message);
    }else{
      addLog('Error checking if RLS DataSet exists.', "ERROR", 500, "UnknownError")
      setStep("step3", StepStatus.ERROR)
      throw new Error("UnknownError");
    }

    if( ! create ){
      addLog('RLS DataSet ' + rlsDataSetId + ' already exists. Updating it.')

      const updateRLSDataSetResponse = await client.models.DataSet.update({
        dataSetArn: rlsDataSetId,
        toolCreated: true,
      })

      if(updateRLSDataSetResponse.errors){
        addLog('Error updating RLS DataSet Tool info. ' + updateRLSDataSetResponse.errors[0].message, "ERROR", 500, "GraphQLError")
        console.error(updateRLSDataSetResponse)
        setStep("step3", StepStatus.ERROR)
        throw new Error(updateRLSDataSetResponse.errors[0].message);
      }    

      addLog("RLS DataSet correctly updated.")
    }else{
      addLog('RLS DataSet ' + rlsDataSetArn + ' does not exist in RLS Tool. Creating it.')
      const rlsDataSetIdSplit = rlsDataSetArn.split("/")
      const rlsDataSetIdExtracted = rlsDataSetIdSplit[rlsDataSetIdSplit.length - 1]

      let datasetParams = {
        name: `Amplify-Managed-RLS for DataSetId: ${dataSetId}`,
        dataSetArn: rlsDataSetArn,
        dataSetId: rlsDataSetIdExtracted, 
        rlsEnabled: RLSStatus.DISABLED , 
        importMode: "SPICE", 
        dataSetRegion: region,
        apiManageable: true,   
        toolCreated: true,
        rlsToolManaged: false,
        glueS3Id: dataSetId
      }

      console.debug(datasetParams)

      const createRLSDataSetResponse = await client.models.DataSet.create( datasetParams )

      if(createRLSDataSetResponse.errors){
        addLog('Error creating RLS DataSet Tool info. ' + createRLSDataSetResponse.errors[0].message, "ERROR", 500, "GraphQLError")
        console.error(createRLSDataSetResponse)
        setStep("step3", StepStatus.ERROR)
        throw new Error(createRLSDataSetResponse.errors[0].message);
      }

      addLog("RLS DataSet correctly created.")
    
    }
  }catch(e){
    const error = e as Error
    addLog(error.name + ": " + error.message, "ERROR", 500, error.name)
    return {
      status: 500,
      message: error.name + ": " + error.message
    }
  }

  setStep("step3", StepStatus.SUCCESS)


  /**
   * Updating RLS of the Main DataSet.
   */

  addLog("===================================================================")
  setStep("step4", StepStatus.LOADING)

  let mainIngestionId = ""

  addLog("Adding the new RLS DataSet to the Main DataSet in QuickSight. Updating the Main DataSet with id: " + dataSetId + " with RLS DataSet with ARN: " + rlsDataSetArn)

  try{
    const publishRLSStep04_QuickSight = await client.queries.publishRLS04QsUpdateMainDataSetRLS({
      region: region,
      dataSetId: dataSetId,
      rlsDataSetArn: rlsDataSetArn
    })

    if(publishRLSStep04_QuickSight && publishRLSStep04_QuickSight.data?.statusCode == 200 && publishRLSStep04_QuickSight.data?.message){
      // HTTP 200 --> DataSet Updated
      addLog(publishRLSStep04_QuickSight.data?.message)
      setStep("step4", StepStatus.SUCCESS)
    }else if(publishRLSStep04_QuickSight && publishRLSStep04_QuickSight.data?.statusCode == 201 && publishRLSStep04_QuickSight.data?.message){
      // HTTP 201 --> DataSet Updating RUNNING  
      // Ingestion Check
      addLog(publishRLSStep04_QuickSight.data.message)
      addLog("Checking DataSet to be Secured Ingestion Status...")

      const ingestionRespone = await qsDataSetIngestionCheck({
        region: region,
        dataSetArn: dataSetArn,
        ingestionId: mainIngestionId,
        addLog
      })

      if(ingestionRespone && ingestionRespone.status == 200 && ingestionRespone.message){
        addLog(ingestionRespone.message)
        addLog("DataSet to be Secured updated successfully.")
        setStep("step4", StepStatus.SUCCESS)
      }else{
        return{
          status: ingestionRespone.status || 500,
          message: ingestionRespone.message || "Unknown Error on Ingestion Check",
          errorType: ingestionRespone.errorType || "UnknownError"
        }
      }
    }else{
      addLog("Error Updating the DataSet to be Secured. Please check the logs for more details.", "ERROR", 500, "DataSetError")
      if(publishRLSStep04_QuickSight.data?.statusCode && publishRLSStep04_QuickSight.data?.message && publishRLSStep04_QuickSight.data?.errorType){
        setStep("step4", StepStatus.ERROR)
        return{
          status: publishRLSStep04_QuickSight.data.statusCode,
          message: publishRLSStep04_QuickSight.data.message,
          errorType: publishRLSStep04_QuickSight.data.errorType
        }
      }else if(publishRLSStep04_QuickSight.errors){
        setStep("step4", StepStatus.ERROR)
        let fullError = ""
        for(const error of publishRLSStep04_QuickSight.errors) {
          addLog(error.errorInfo + " - " + error.message, "ERROR", 500, error.errorType)
          fullError += error.errorType + ": " + error.errorInfo + " - " + error.message
        }
        return{
          status: 500,
          message: fullError,
          errorType: publishRLSStep04_QuickSight.errors[0].errorType
        }
      }else{
        throw new Error("Error Updating the DataSet to be Secured. Please check the logs for more details.");
      }
    }

  }catch(e){
    const error = e as Error
    setStep("step4", StepStatus.ERROR)
    return {
      status: 500,
      errorType: "UnknownError",
      message: error.message,
    };
  }

  /**
   * Updating RLS Tool database
   */
  addLog("===================================================================")
  try{
    addLog("Updating RLS Tool Database")
    setStep("step5", StepStatus.LOADING)

    // Update the Selected DataSet 
    addLog('Updating DataSet ' + dataSetId + " in RLS Tool with new RLS Info.")

    const updateDataSetResponse = await client.models.DataSet.update({
      dataSetArn: dataSetArn,
      rlsToolManaged: true,
      rlsDataSetId: rlsDataSetArn,
      rlsEnabled: "ENABLED"
    })

    if(updateDataSetResponse.errors){
      addLog('Error updating DataSet RLS Tool info. ' + updateDataSetResponse.errors[0].message, "ERROR", 500, "GraphQLError")
      setStep("step5", StepStatus.ERROR)
      throw new Error(updateDataSetResponse.errors[0].message);
    }

    addLog("DataSet updated correctly.")
  
    setStep("step5", StepStatus.SUCCESS)
    
    return {
      status: 200,
      message: "All Steps Completed. RLS Set in QuickSight for DataSet " + dataSetId + " with RLS DataSet with ARN: " + rlsDataSetArn + "."
    }

  }catch (e){
    setStep("step5", StepStatus.ERROR)
    const error = e as Error
    addLog(error.name + ": " + error.message, "ERROR", 500, error.name)
    return {
      status: 500,
      message: error.name + ": " + error.message
    }
  }
}