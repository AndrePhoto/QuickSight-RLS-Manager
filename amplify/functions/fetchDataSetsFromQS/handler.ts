import type { Schema } from "../../data/resource";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/fetchDataSetsFromQS';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import { QuickSightClient, ListDataSetsCommand, AccessDeniedException, ResourceNotFoundException, ThrottlingException, InvalidParameterValueException } from "@aws-sdk/client-quicksight";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * This function will perform a ListDataSets call to Quicksight APIs to retrieve datasets list and count
 * @param event 
 * qsManagementRegion: QuickSight Management Region
 * @returns 
 */
export const handler: Schema["fetchDataSetsFromQS"]["functionHandler"] = async ( event ) => {

  console.log("Start to fetch Datasets from QuickSight") 

  try {  
    // Check Environment Variables
    const accountId = env.ACCOUNT_ID || null

    // If Environment Variables have failed to load, or in the QuickSight Management Region is missing, then throw an Error
    if( ! accountId  ){
      throw new Error("Missing environment variables")
    }
    
    // Initialize the QuickSight client
    const quicksightClient = new QuickSightClient({ region:  event.arguments.region });

    // Fetch all Datasets with Pagination (if any)
    if( ! event.arguments.nextToken ){
      console.log("Fetching Datasets, first call")
    }else{
      console.log("Fetching Datasets, next call. NextToken: ", event.arguments.nextToken)
    }

    // Create the ListDatasets command
    const command = new ListDataSetsCommand({
      AwsAccountId: accountId,
      MaxResults: parseInt(env.API_MAX_RESULTS),
      ...(event.arguments.nextToken && { NextToken: event.arguments.nextToken })
    });
    // Execute the command
    const response = await quicksightClient.send(command);
    console.log( "Processing response" )

    if( response.DataSetSummaries && response.Status === 200){
      return {
        statusCode: 200,
        message: 'QuickSight Datasets fetched successfully',
        datasetsList: JSON.stringify(response.DataSetSummaries),
        nextToken: response.NextToken
      };
    } else{
      console.log("Error processing response: ", response)
      throw new Error("Error processing response.")
    }

  } catch (error) {
    let errorStatus = 500
    let errorMessage = "Generic Error"
    let errorName = "Unknown Error"

    if (error instanceof AccessDeniedException) {
      errorMessage = 'Access Denied to QuickSight resources',
      errorStatus = 403,
      errorName = "AccessDeniedException"
    } else if (error instanceof ResourceNotFoundException) {
      errorStatus = 404,
      errorMessage = 'Resource not found',
      errorName = "ResourceNotFoundException"
    } else if (error instanceof ThrottlingException) {
      errorStatus = 429,
      errorMessage = 'Request was throttled',
      errorName = "ThrottlingException"
    } else if (error instanceof InvalidParameterValueException) {
      errorStatus = 400,
      errorMessage = 'Invalid parameters provided',
      errorName = "InvalidParameterValueException"
    } else {
      errorStatus = 500,
      errorMessage = 'An unexpected error occurred',
      errorName = "UnknownError"
    }
    
    console.error(errorName + ": " + errorMessage);
    return {
      statusCode: errorStatus,
      message: errorMessage,
      errorName: errorName,
      datasetsList: ""
    };
  }finally{
    console.log("End of fetch Datasets from QuickSight")
  }
};