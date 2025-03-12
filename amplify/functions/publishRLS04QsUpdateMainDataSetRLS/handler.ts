import type { Schema } from "../../data/resource"
import { DescribeDataSetCommand, QuickSightClient, UpdateDataSetCommand } from "@aws-sdk/client-quicksight";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import { env } from '$amplify/env/publishRLS04QsUpdateMainDataSetRLS';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * Publich data to QuickSight with new DataSet Creation
 */
export const handler: Schema["publishRLS04QsUpdateMainDataSetRLS"]["functionHandler"] = async ( event ) => {

  // console.log(`Start publishing RLS to QuickSight. Arguments: ${JSON.stringify(event.arguments)}`)

  const accountId = env.ACCOUNT_ID || null

  const dataSetId = event.arguments.dataSetId
  const region = event.arguments.region
  const rlsDataSetArn = event.arguments.rlsDataSetArn

  /** 
   * Validating Arguments and Variables
   */
  console.info("Validating arguments and environment variables.")
  
  try {
    if( ! accountId ){ throw new ReferenceError("Missing 'accountId' variable.") }
    if( ! region ){ throw new ReferenceError("Missing 'region' argument.") }
    if( ! dataSetId ){ throw new ReferenceError("Missing 'dataSetId' argument.") }
    if( ! rlsDataSetArn ){ throw new ReferenceError("Missing 'rlsDataSetArn' argument.") }
  }catch(e){
    if( e instanceof ReferenceError ){
      console.error(e.name + ": " + e.message)
      return {
        statusCode: 400,
        message: e.name + ": " + e.message,
        errorType: e.name
      }
    
    }else{
      console.error(e)
      return {
        statusCode: 500,
        message: "Unknown Error. Please check the logs.",
        errorType: "UnknownError"
      }
    }
  }

  /**
   * QuickSight
   */

  const quicksightClient = new QuickSightClient({ region: region });

  let ingestionId = "" 

  console.log(`Updating RLS of DataSet ${dataSetId} with RLS DataSet ${rlsDataSetArn}`)

  try{

    // Get the dataset to be modified
    const getDataSetInfoCommand = new DescribeDataSetCommand({
      AwsAccountId: accountId, // Get this from environment variable
      DataSetId: dataSetId, // Adjust based on your needs
    })

    const dataSetInfoResponse = await quicksightClient.send(getDataSetInfoCommand)

    if (dataSetInfoResponse && dataSetInfoResponse.Status === 200 && dataSetInfoResponse.DataSet){
      const dataSetToSecure = dataSetInfoResponse.DataSet

      if(dataSetInfoResponse.DataSet.RowLevelPermissionDataSet?.Arn && dataSetInfoResponse.DataSet.RowLevelPermissionDataSet?.Arn == rlsDataSetArn ){
        console.info("DataSet RLS is already set to " + rlsDataSetArn + ". Checking that RLS DataSet really exists.")
        const rlsDataSetIdSplit = dataSetInfoResponse.DataSet.RowLevelPermissionDataSet.Arn.split("/")
        const rlsDataSetIdExtracted = rlsDataSetIdSplit[rlsDataSetIdSplit.length - 1]

        try {
          const getRLSDataSetInfoCommand = new DescribeDataSetCommand({
            AwsAccountId: accountId,
            DataSetId: rlsDataSetIdExtracted
          })

          const rlsDataSetInfoResponse = await quicksightClient.send(getRLSDataSetInfoCommand)

          if(rlsDataSetInfoResponse.Status == 200){
            return {
              statusCode: 200,
              message: "DataSet RLS is already set to " + rlsDataSetArn + ". RLS Already set.",
              ingestionId: ""
            }
          }else{
            throw new Error("Failed to check RLS DataSet.")
          }
        }catch(e){
          if(e instanceof Error) {
            const errorMessage = `[${e.name}] Creating or Updating RLS DataSet failed: ${e.message}`
            let statusCode = 500
            let errorType = e.name
      
            switch (e.name) {
              case "ResourceNotFoundException": // THIS IS THE INTERESTING PART.
                statusCode = 404
                break
              case "InvalidParameterValueException":
                statusCode = 400
                break
              case "AccessDeniedException":
                statusCode = 401
                break
              case "UnsupportedUserEditionException":
                statusCode = 403
              case "ConflictException":
              case "LimitExceededException":
              case "ResourceExistsException":
                statusCode = 409
                break
              case "ThrottlingException":
                statusCode = 429
                break
              case "InternalFailureException":
                statusCode = 500
                break
              default:
                statusCode = 500
                errorType = "UnknownError"
            }

            if( statusCode == 404 ){
              console.info("DataSet RLS is set to " + rlsDataSetArn + ", but this RLS DataSet does not exists in QuickSight. Proceeding to create a RLS DataSet.")
            }else{
              console.error("Failed to check if RLS DataSet assigned to DataSet to be Secured really exists.")
              console.error(errorMessage)
              return {
                statusCode: statusCode,
                errorType: errorType,
                message: errorMessage,
              }
            }
          } else {
            return {
              statusCode: 500,
              errorType: "UnknownError",
              message: "An unknown error occurred.",
            }
          }
        }
      }else{
        console.info("DataSet RLS is not set to " + rlsDataSetArn + ". Updating DataSet to be Secured with the RLS DataSet.")
      }

      const updateDataSetCommand = new UpdateDataSetCommand({
        AwsAccountId: accountId,
        DataSetId: dataSetToSecure.DataSetId,
        Name: dataSetToSecure.Name,
        PhysicalTableMap: dataSetToSecure.PhysicalTableMap,
        LogicalTableMap: dataSetToSecure.LogicalTableMap,
        ImportMode: dataSetToSecure.ImportMode,
        RowLevelPermissionDataSet: {
          Arn: rlsDataSetArn,
          PermissionPolicy: "GRANT_ACCESS",
          Status: "ENABLED",
          FormatVersion: "VERSION_2",
        }
      })

      const updateDataSetResponse = await quicksightClient.send(updateDataSetCommand)

      if(updateDataSetResponse.$metadata.httpStatusCode != 200 && updateDataSetResponse.$metadata.httpStatusCode != 201){
        console.error(updateDataSetResponse)
        throw new Error("Error updating QuickSight DataSet to be Secured")
      }else if(updateDataSetResponse.$metadata.httpStatusCode == 200){
        console.info("QuickSight DataSet to be Secured updated successfully.")
        return {
          statusCode: 200,
          message: "QuickSight DataSet to be Secured updated successfully.",
        }
      }else if(updateDataSetResponse.$metadata.httpStatusCode == 201){
        if( ! updateDataSetResponse.IngestionId || updateDataSetResponse.IngestionId === "" || updateDataSetResponse.IngestionId == null ){
          console.error("No IngestionId found.", "ERROR", 404, "QuickSightError")
          throw new Error("No IngestionId found.")
        }else{
          console.info("QuickSight DataSet to be Secured updating in progress.")
          ingestionId = updateDataSetResponse.IngestionId

          console.debug("ingestionId: " + ingestionId)
          console.debug(updateDataSetResponse)
          
          return {
            statusCode: 201,
            message: "QuickSight DataSet to be Secured updating in progress.",
            ingestionId: ingestionId
          }
        }
      }
    }else{
      console.error("Error getting DataSet to be Secured Info")
      throw new Error("Error getting DataSet to be Secured Info")
    }

  }catch(e){

    if(e instanceof Error) {
      const errorMessage = `[${e.name}] Creating or Updating RLS DataSet failed: ${e.message}`
      let statusCode = 500
      let errorType = e.name

      switch (e.name) {
        case "InvalidParameterValueException":
          statusCode = 400
          break
        case "AccessDeniedException":
          statusCode = 401
          break
        case "UnsupportedUserEditionException":
          statusCode = 403
        case "ResourceNotFoundException":
          statusCode = 404
          break
        case "ConflictException":
        case "LimitExceededException":
        case "ResourceExistsException":
          statusCode = 409
          break
        case "ThrottlingException":
          statusCode = 429
          break
        case "InternalFailureException":
          statusCode = 500
          break
        default:
          statusCode = 500
          errorType = "UnknownError"
      }
      console.error(errorMessage)
      return {
        statusCode: statusCode,
        errorType: errorType,
        message: errorMessage,
      }
    } else {
      return {
        statusCode: 500,
        errorType: "UnknownError",
        message: "An unknown error occurred.",
      }
    }
  }

  return {
    statusCode: 500,
    message: "You shouldn't be here. Why are you here? Damn.",
  }
}