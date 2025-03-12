import type { Schema } from "../../data/resource";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/deleteDataSetFromQS';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import { QuickSightClient, DescribeDataSetCommand, UpdateDataSetCommand, DeleteDataSetCommand } from "@aws-sdk/client-quicksight";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 */
export const handler: Schema["deleteDataSetFromQS"]["functionHandler"] = async ( event ) => {

  const accountId = env.ACCOUNT_ID || null
  const dataSetId = event.arguments.dataSetId
  const region = event.arguments.region

  let ingestionId = ""

  try {  
    if( ! accountId ){ throw new ReferenceError("Missing 'accountId' variable.") }
    if( ! region ){ throw new ReferenceError("Missing 'region' argument.") }
    if( ! dataSetId ){ throw new ReferenceError("Missing 'dataSetId' argument.") }
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

  try{
    // Initialize the QuickSight client
    const quicksightClient = new QuickSightClient({ region:  region });

    // Create the ListDatasets command
    const command = new DeleteDataSetCommand({
      AwsAccountId: accountId,
      DataSetId: dataSetId
    });

    // Execute the command
    const response = await quicksightClient.send(command);
    console.log( "Processing response" )

    if( response.$metadata.httpStatusCode != 200 ){
      console.error(response)
      throw new Error("Error deleting QuickSight DataSet")
    }

    return {
      statusCode: 200,
      message: "QuickSight DataSet deleted successfully.",
    }

  } catch (e) {
    if(e instanceof Error) {
      const errorMessage = `[${e.name}] Deleting RLS DataSet failed: ${e.message}`
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
          statusCode = 200
          return {
            statusCode: statusCode,
            errorType: "ResourceNotFoundException",
            message: "Resource is already not in present in QuickSight",
          }
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
};