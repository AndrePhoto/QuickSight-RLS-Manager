import type { Schema } from "../../data/resource"
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { GlueClient, DeleteTableCommand } from "@aws-sdk/client-glue"; // ES Modules import

import { env } from '$amplify/env/deleteDataSetGlueTable';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * Publich data to QuickSight with new DataSet Creation
 */
export const handler: Schema["deleteDataSetGlueTable"]["functionHandler"] = async ( event ) => {

  const accountId = env.ACCOUNT_ID

  const region = event.arguments.region
  const glueDatabaseName = event.arguments.glueDatabaseName

  const glueKey = event.arguments.glueKey

  /**
   * Validating Arguments and Variables
   */
  try {
    if( ! accountId ){ throw new ReferenceError("Missing 'accountId' variable.") }
    if( ! region ){ throw new ReferenceError("Missing 'region'.") }
    if( ! glueKey ){ throw new ReferenceError("Missing glueKey") }
    if( ! glueDatabaseName ){ throw new ReferenceError("Missing tool Resource: glueDatabaseName") }

  }catch(e){
    console.error(e)
    if( e instanceof ReferenceError ){
      console.error("[ReferenceError]: Error validating the input variables. " + e.message )
      return {
        statusCode: 400,
        message: "Error validating the input variables. " + e.message,
        errorType: "ReferenceError"
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
 
  const glueTableName = `qs-rls-${glueKey}`

  const glueClient = new GlueClient({ region: region });

  try{
    const glueDeleteTableCommand = new DeleteTableCommand({
      DatabaseName: glueDatabaseName,
      Name: glueTableName
    })

    

    const deleteTableResponse = await glueClient.send(glueDeleteTableCommand)

    if(deleteTableResponse.$metadata.httpStatusCode != 200){
      console.error(deleteTableResponse)
      throw new Error(`Error deleting Glue Table '${glueTableName}' in Glue Database '${glueDatabaseName}'`)
    }else{
      console.info(`Glue Table '${glueTableName}' deleted from Glue Database '${glueDatabaseName}'.`)
    }

  }catch(e){

    if(e instanceof Error) {
      console.error(e.message)
      const errorMessage = `[${e.name}] Failed deleting Glue Table ${glueTableName}: ${e.message}`
      let statusCode = 500
      let errorType = e.name

      switch (e.name) {
        case "EntityNotFoundException":
          console.warn(`[${e.name}] Glue Table '${glueTableName}' not found in Glue Database '${glueDatabaseName}'.`)
          break
        case "FederationSourceException":
        case "InvalidInputException":
        case "OperationTimeoutException":
        case "ResourceNotReadyException":
        case "FederationSourceRetryableException":
          statusCode = 400
          break
        case "GlueEncryptionException": 
        case "InternalServiceException":
          statusCode = 500
          break
        default:
          statusCode = 500
          errorType = "UnknownError"
      }
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
    statusCode: 200,
    message: `Glue Table '${glueTableName}' deleted successfully.`,
  }
}