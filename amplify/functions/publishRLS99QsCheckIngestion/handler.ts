import type { Schema } from "../../data/resource"
import { DescribeIngestionCommand, QuickSightClient } from "@aws-sdk/client-quicksight";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';


import { env } from '$amplify/env/publishRLS99QsCheckIngestion';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * Publich data to QuickSight with new DataSet Creation
 */
export const handler: Schema["publishRLS99QsCheckIngestion"]["functionHandler"] = async ( event ) => {

  // console.log(`Start publishing RLS to QuickSight. Arguments: ${JSON.stringify(event.arguments)}`)

  const accountId = env.ACCOUNT_ID || null

  const dataSetId = event.arguments.dataSetId
  const region = event.arguments.datasetRegion
  const ingestionId = event.arguments.ingestionId

  /**
   * Validating Arguments and Variables
   */
  console.log("Validating arguments and variables.")
  if( ! accountId ){
    throw new Error("Missing environment variables")
  }

  /**
   * QuickSight
   */
  try{

    const quicksightClient = new QuickSightClient({ region: region });

    const ingestionCommand = new DescribeIngestionCommand({
      AwsAccountId: accountId,
      DataSetId: dataSetId,
      IngestionId: ingestionId
    })
  
    const ingestionResponse = await quicksightClient.send(ingestionCommand)
  
    if(ingestionResponse && ingestionResponse.Ingestion?.IngestionStatus === "COMPLETED"){
      console.log( "RLS DataSet Correctly Created / Updated." )
      return {
        statusCode: 200,
        message: "RLS DataSet Correctly Created / Updated.",
      }
    }else if (ingestionResponse && (ingestionResponse.Ingestion?.IngestionStatus === "FAILED" || ingestionResponse.Ingestion?.IngestionStatus === "CANCELLED")){
      console.log(ingestionResponse)
      return {
        statusCode: 500,
        message: "Error" + ingestionResponse.Ingestion?.ErrorInfo?.Message,
        errorType: "QuickSightIngestion_" + ingestionResponse.Ingestion?.IngestionStatus + "_" + ingestionResponse.Ingestion?.ErrorInfo?.Type,
      }
    }else if(ingestionResponse && ( ingestionResponse.Ingestion?.IngestionStatus === "QUEUED" || ingestionResponse.Ingestion?.IngestionStatus === "INITIALIZED" || ingestionResponse.Ingestion?.IngestionStatus === "RUNNING")){ 
      console.log("Still creating dataset...")
      return {
        statusCode: 201,
        message: "Still creating dataset...",
      }
    } else {
      throw new Error("Unknown Error")
    }


  }catch(err){
    const error = err as Error
    console.log(error)

    return {
      statusCode: 500,
      message: "Error creating or Updating QuickSight DataSet. " + error.message,
      errorType: error.name
    }

  }
}