import type { Schema } from "../../data/resource";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/fetchGroupsFromQS';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import { QuickSightClient, ListGroupsCommand } from "@aws-sdk/client-quicksight";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * This function will perform a ListGroups call to Quicksight APIs to retrieve groups list and count
 */
export const handler: Schema["fetchGroupsFromQS"]["functionHandler"] = async ( event ) => {

  console.log("Start to fetch Groups from QuickSight")

  try {  
    // Check Environment Variables
    const accountId = env.ACCOUNT_ID || null

    // If Environment Variables have failed to load, or in the QuickSight Management Region is missing, then throw an Error
    if( ! accountId ){
      throw new Error("Missing environment variables")
    }
    
    // Initialize the QuickSight client
    const quicksightClient = new QuickSightClient({ region:  event.arguments.qsManagementRegion });

    // Fetch all Groups with Pagination (if any)
    if( ! event.arguments.nextToken ){
      console.log("Fetching Groups, first call")
    }else{
      console.log("Fetching Groups, next call. NextToken: ", event.arguments.nextToken)
    }

    // Create the ListGroups command
    const command = new ListGroupsCommand({
      AwsAccountId: accountId,
      MaxResults: parseInt(env.API_MAX_RESULTS),
      Namespace: event.arguments.namespace,
      ...(event.arguments.nextToken && { NextToken: event.arguments.nextToken })
    });
    // Execute the command
    const response = await quicksightClient.send(command);
    console.log( "Processing response" )

    if( response.GroupList && response.Status === 200){
      return {
        statusCode: 200,
        message: 'QuickSight Groups fetched successfully',
        groupsList: JSON.stringify(response.GroupList),
        nextToken: response.NextToken
      };
    } else{
      console.log("Error processing response: ", response)
      throw new Error("Error processing response.")
    }

  } catch (errors) {
    const err = errors as Error
    const errorMessage = JSON.stringify(err.message, null, 2)
    console.error('Error listing QuickSight Groups: ', errorMessage);
    return {
      statusCode: 500,
      message: errorMessage,
      errorName: err.name,
      groupsList: ""
    };
  }
};