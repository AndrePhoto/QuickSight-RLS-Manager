import { generateClient } from "aws-amplify/data";
import { Schema } from "../../amplify/data/resource";

import { qsDataSetIngestionCheck } from "./qsDataSetIngestionCheck";
import { StepStatus } from "./STEP_STATUS";

interface DeleteDataSetManagerProps {
  accountId: string;
  region: string;
  s3BucketName: string;
  glueDatabaseName: string;
  rlsDataSetArn: string;
  keepS3: boolean;
  keepPermissions: boolean;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
  setStep: (step: string, stepStatus: StepStatus) => void;
}

interface FunctionManagerResult {
  status: number;
  message: string;
  errorType? : string
}

const client = generateClient<Schema>();

export const deleteSingleDataSet = async({
  accountId,
  region,
  s3BucketName,
  glueDatabaseName,
  rlsDataSetArn,
  keepS3,
  keepPermissions,
  addLog,
  setStep
}: DeleteDataSetManagerProps): Promise<FunctionManagerResult> => {

  /**
   * Validating Arguments and Variables
   */
  try {
    setStep("step0", StepStatus.LOADING)
    addLog("Delete started.")
    if( ! region ){ throw new ReferenceError("Missing 'region'.") }
    if( ! s3BucketName ){ throw new ReferenceError("Missing tool Resource: 's3BucketName'") }
    if( ! glueDatabaseName ){ throw new ReferenceError("Missing tool Resource: 'glueDatabaseName'") }
    if( ! rlsDataSetArn ){ throw new ReferenceError("Missing 'rlsDataSetArn'") }
  }catch(e){
    setStep("step0", StepStatus.ERROR)
    addLog((e as Error).message, "ERROR", 500, (e as Error).name)
    console.error(e)
    if( e instanceof ReferenceError ){
      console.error("[ReferenceError]: Error validating the input variables. " + e.message )
      return {
        status: 400,
        message: "Error validating the input variables. " + e.message,
        errorType: "ReferenceError"
      }
    
    }else{
      console.error(e)
      return {
        status: 500,
        message: "Unknown Error. Please check the logs.",
        errorType: "UnknownError"
      }
    }
  }
  setStep("step0", StepStatus.SUCCESS)

  /**
   * Fetch DataSets with rlsDataSetArn as Row Level Security dataSet
   */
  setStep("step1", StepStatus.LOADING)
  let dataSetsWithRLSList: any[] = []
  addLog("===================================================================")

  try{
    addLog("Listing DataSets with RLS set with RLS DataSet indicated.")

    const  { data: dataSetsWithRLS, errors } = await client.models.DataSet.list({
      filter: {
        rlsDataSetId: {
          eq: `arn:aws:quicksight:${region}:${accountId}:dataset/${rlsDataSetArn}`
        }
      }
    });

    if( errors ){
      addLog('Error listing DataSets with RLS set with RLS DataSet indicated. ' + errors[0].message, "ERROR", 500, "GraphQLError")
      throw new Error(errors[0].message);
    }else{
      addLog(`DataSets with RLS set with RLS DataSet indicated: ${dataSetsWithRLS.length}`)
      dataSetsWithRLSList = dataSetsWithRLS
    }
  }catch(e){
    setStep("step1", StepStatus.ERROR)
    const error = e as Error
    addLog(error.name + ": " + error.message, "ERROR", 500, error.name)
    return {
      status: 500,
      message: error.name + ": " + error.message
    }
  }
  setStep("step1", StepStatus.SUCCESS)

  /**
   * Remove RLSDataSet from RLS of other DataSets in QS
   */
  addLog("===================================================================")
  setStep("step2", StepStatus.LOADING)
  if(dataSetsWithRLSList.length > 0){
    
    addLog("Removing RLS DataSet from other DataSets in RLS Tool.")
    try{
      for( const dataset of dataSetsWithRLSList){
        const updateResponse = await client.queries.removeRLSDataSet({
          dataSetId: dataset.dataSetId,
          region: region
        })

        if(updateResponse && updateResponse.data?.statusCode != 200 && updateResponse.data?.statusCode != 201){
          console.error(updateResponse)

          addLog("Failed to remove RLS from DataSet " + dataset.dataSetId, "ERROR", 404, "QSUpdateFailed")
          throw new Error("Failed to remove RLS from DataSet " + dataset.dataSetId);
        }else{
          if(updateResponse.data?.statusCode == 201 && updateResponse.data.ingestionId){
            const ingestionRespone = await qsDataSetIngestionCheck({
              region: region,
              dataSetArn: rlsDataSetArn,
              ingestionId: updateResponse.data?.ingestionId,
              addLog
            })
      
            if(ingestionRespone && ingestionRespone.status == 200 && ingestionRespone.message){
              addLog(ingestionRespone.message)
              addLog("RLS DataSet created/updated successfully.")
            }else{
              setStep("step2", StepStatus.ERROR)
              return{
                status: ingestionRespone.status || 500,
                message: ingestionRespone.message || "Unknown Error on Ingestion Check",
                errorType: ingestionRespone.errorType || "UnknownError"
              }
            }
          }else if(updateResponse.data?.statusCode == 201 && ! updateResponse.data.ingestionId){
            addLog("No Ingestion ID returned from QS");
            throw new Error("No Ingestion ID returned from QS");
          }

          addLog("RLS correctly removed from DataSet " + dataset.dataSetId)
        }
      }

    }catch(e){
      setStep("step2", StepStatus.ERROR)
      const error = e as Error
      addLog(error.name + ": " + error.message, "ERROR", 500, error.name)
      return {
        status: 500,
        message: error.name + ": " + error.message
      }
    }
  }else{
    addLog("No DataSets with RLS set with RLS DataSet selected.")
  }
  setStep("step2", StepStatus.SUCCESS)

  /**
   * Delete RLSDataSet in QS
   */
  addLog("===================================================================")
  setStep("step3", StepStatus.LOADING)
  try{
    // extract ID from rlsDataSetArn
    addLog("Deleting RLS DataSet from QS: " + rlsDataSetArn)

    const deleteResponse = await client.queries.deleteDataSetFromQS({
      dataSetId: rlsDataSetArn,
      region: region
    })

    if(deleteResponse && deleteResponse.data && deleteResponse.data?.statusCode != 200 ){
      const errorType = (deleteResponse.data?.errorType && deleteResponse.data.errorType != null) ? deleteResponse.data.errorType : "QsDeleteFailed"
      addLog('Error deleting RLS DataSet from QS. ' + deleteResponse.data?.message, "ERROR", deleteResponse.data?.statusCode, errorType)
      throw new Error(deleteResponse.data?.message);
    }else{
      addLog("RLS DataSet deleted from QS.")
    }

  }catch(e){
    setStep("step3", StepStatus.ERROR)
    console.log(e)
    const error = e as Error
    if (e instanceof Error) {
      console.log(e.name)
    }
    console.log(error)
    addLog(error.name + ": " + error.message, "ERROR", 500, error.name)
    return {
      status: 500,
      message: error.name + ": " + error.message
    }
  }
  setStep("step3", StepStatus.SUCCESS)

  /**
   * Delete RLSDataSet in RLS Tool
   */
  let glueS3Id = "" 
  addLog("===================================================================")
  setStep("step4", StepStatus.LOADING)
  try{
    addLog("Deleting RLS DataSet from RLS Tool: " + rlsDataSetArn)
    // arn:aws:quicksight:eu-central-1:418295695470:dataset/RLS-a380e69c-ee6a-45f9-851f-1bc2f05c4341
    const {data: describeRLSDataSet, errors} = await client.models.DataSet.get({ 
      dataSetArn: `arn:aws:quicksight:${region}:${accountId}:dataset/${rlsDataSetArn}` 
    })

    if(errors){
      addLog('Error fetching RLS DataSet details from the RLS Tool. ' + errors[0].message, "ERROR", 500, "GraphQLError")
      throw new Error(errors[0].message);
    }else if (! describeRLSDataSet){
      addLog('Error fetching RLS DataSet details from the RLS Tool. Empty Response.', "ERROR", 500, "GraphQLError")
      throw new Error('Error fetching RLS DataSet details from the RLS Tool. Empty Response.');
    }else{
      if(describeRLSDataSet.glueS3Id){
        glueS3Id = describeRLSDataSet.glueS3Id
        addLog("RLS DataSet glueS3Id: " + glueS3Id)
      }else{
        addLog('Error fetching RLS DataSet glueS3Id from the RLS Tool.', "ERROR", 500, "GraphQLError")
        throw new Error('Error fetching RLS DataSet glueS3Id from the RLS Tool.');
      }
    }

    addLog("Deleting RLS DataSet from RLS Tool.")
    const deleteRLSDataSet = await client.models.DataSet.delete({ dataSetArn: `arn:aws:quicksight:${region}:${accountId}:dataset/${rlsDataSetArn}`  })

    if( deleteRLSDataSet.errors ){
      addLog('Error deleting RLS DataSet from the RLS Tool. ' + deleteRLSDataSet.errors[0].message, "ERROR", 500, "GraphQLError")
      throw new Error(deleteRLSDataSet.errors[0].message);
    }else{
      addLog("RLS DataSet correctly deleted from RLS Tool.")
    }

  }catch(e){
    setStep("step4", StepStatus.ERROR)
    const error = e as Error
    addLog(error.name + ": " + error.message, "ERROR", 500, error.name)
    return {
      status: 500,
      message: error.name + ": " + error.message
    }
  }

  /**
   * Remove RLSDataSet from RLS of other DataSets in RLS Manager
   */
  addLog("===================================================================")
  try{
    addLog("Removing RLS DataSet from other DataSets in RLS Tool, if any.")

    for( const dataSet of dataSetsWithRLSList ){
      addLog("Removing RLS DataSet from DataSet with Id: " + dataSet.dataSetId)
      const {data: updateDataSetResponse, errors} = await client.models.DataSet.update({
        dataSetArn: dataSet.dataSetArn,
        rlsDataSetId: null,
        rlsEnabled: "DISABLED",
        rlsToolManaged: false,
        toolCreated: false
      })

      if(errors){
        addLog('Error updating DataSet RLS Tool info. ' + errors[0].message, "ERROR", 500, "GraphQLError")
        throw new Error(errors[0].message);
      }else{
        addLog("DataSet "+ updateDataSetResponse?.dataSetId + "updated correctly.")
      }    

      if(keepPermissions){
        addLog("Keeping permissions for DataSet " + dataSet.dataSetId)
        continue
      }else{
        addLog("Removing permissions for DataSet " + dataSet.dataSetId)
        const {data: permissionsList, errors: permissionsErrors} = await dataSet.permissions()
        if (permissionsErrors) {
          addLog('Error fetching permissions for DataSet. ' + permissionsErrors[0].message, "ERROR", 500, "GraphQLError")
          throw new Error(permissionsErrors[0].message);
        }else{
          addLog(`Removing all permission linked to DataSet ${dataSet.dataSetId}`)
          for (const permission of permissionsList) {
            try {
              const { errors: revokeErrors } = await client.models.Permission.delete({
                id: permission.id
              });
        
              if (revokeErrors) {
                addLog(`Error revoking permission: ${revokeErrors[0].message}`, "ERROR", 500, "GraphQLError");
                throw new Error(revokeErrors[0].message);
              }
              
              addLog(`Successfully removed permission for DataSet ${dataSet.dataSetId}`);
            } catch (e) {
              const error = e as Error;
              addLog(`Failed to remove permission: ${error.message}`, "ERROR", 500, error.name);
              throw error;
            }
          }

        }
      }
    }

  }catch(e){
    setStep("step4", StepStatus.ERROR)
    const error = e as Error
    addLog(error.name + ": " + error.message, "ERROR", 500, error.name)
    return {
      status: 500,
      message: error.name + ": " + error.message
    }
  }
  setStep("step4", StepStatus.SUCCESS)

  /**
   * Remove RLS DataSet from GlueTable and (if user does not select to keep it) from S3
   */
  addLog("===================================================================")
  addLog("Remove GlueTable for RLS DataSet") 
  setStep("step5", StepStatus.LOADING)
  try{
    const deleteGlue = await client.queries.deleteDataSetGlueTable({
      region: region,
      glueKey: glueS3Id,
      glueDatabaseName: glueDatabaseName,
    })

    if(deleteGlue && deleteGlue.data?.statusCode != 200 ){
      addLog('Error deleting Glue Table. ' + deleteGlue.data?.message, "ERROR", 500, "GlueTableDeleteError")
      throw new Error(deleteGlue.data?.message);
    }else{
      addLog("Glue Table deleted.")
    }

  }catch(e){
    setStep("step5", StepStatus.ERROR)
    const error = e as Error
    addLog(error.name + ": " + error.message, "ERROR", 500, error.name)
    return {
      status: 500,
      message: error.name + ": " + error.message
    }
  }
  setStep("step5", StepStatus.SUCCESS)

  /**
   *  Remove S3 files
   */

  addLog("===================================================================")
  setStep("step6", StepStatus.LOADING)
  
  if( keepS3 ){
    // extract id from rlsDataSetArn
    addLog(`Keeping S3 objects for RLS DataSet. S3 Key: ${s3BucketName}/RLS-Datasets/${rlsDataSetArn}/*`) 
  }else{
    // DeleteObjectCommand
    // versionId
    addLog(`Removing all S3 objects for RLS DataSet in: ${s3BucketName}/RLS-Datasets/${rlsDataSetArn}/*`)

    try{
      const deleteS3 = await client.queries.deleteDataSetS3Objects({
        region: region,
        s3Key: glueS3Id,
        s3BucketName: s3BucketName,
      })
  
      if(deleteS3 && deleteS3.data?.statusCode != 200 ){
        addLog('Error deleting S3 objects. ' + deleteS3.data?.message, "ERROR", 500, "S3DeleteError")
        throw new Error(deleteS3.data?.message);
      }else{
        addLog("S3 objects deleted.")
      }
  
    }catch(e){
      setStep("step6", StepStatus.ERROR)
      const error = e as Error
      addLog(error.name + ": " + error.message, "ERROR", 500, error.name)
      return {
        status: 500,
        message: error.name + ": " + error.message
      }
    }
    
  }

  setStep("step6", StepStatus.SUCCESS)
  return {
    status: 200,
    message: "DataSet Deletion Completed"
  }

}