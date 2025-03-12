import type { Schema } from "../../data/resource";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/fetchNamespacesFromQS';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import { QuickSightClient, ListNamespacesCommand } from "@aws-sdk/client-quicksight";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * This function will perform a ListNamespaces call to Quicksight APIs to retrieve namespaces list and count
 */
export const handler: Schema["fetchNamespacesFromQS"]["functionHandler"] = async ( event ) => {

  console.log("Start to fetch Namespaces from QuickSight") 

  try {  
    // Check Environment Variables
    const accountId = env.ACCOUNT_ID || null

    // If Environment Variables have failed to load, or in the QuickSight Management Region is missing, then throw an Error
    if( ! accountId ){
      throw new Error("Missing environment variables")
    }
    
    // Initialize the QuickSight client
    const quicksightClient = new QuickSightClient({ region:  event.arguments.qsManagementRegion });

    // Fetch all Namespaces with Pagination (if any)
    if( ! event.arguments.nextToken ){
      console.log("Fetching Namespaces, first call")
    }else{
      console.log("Fetching Namespaces, next call. NextToken: ", event.arguments.nextToken)
    }

    // Create the ListNamespaces command
    const command = new ListNamespacesCommand({
      AwsAccountId: accountId,
      MaxResults: parseInt(env.API_MAX_RESULTS),
      ...(event.arguments.nextToken && { NextToken: event.arguments.nextToken })
    });

    // Execute the command
    const response = await quicksightClient.send(command);
    console.log( "Processing response" )

    if( response.Namespaces && response.Status === 200){
      // namespacesList is an array of namespaces as JSON with arn, name and capacityRegion extracted from response variable
      const namespacesList = response.Namespaces.map((namespace: any) => ({
        arn: namespace.Arn,
        name: namespace.Name,
        capacityRegion: namespace.CapacityRegion
      }));

      return {
        statusCode: 200,
        message: 'QuickSight Namespaces fetched successfully',
        namespacesList: JSON.stringify(namespacesList),
        nextToken: response.NextToken
      };
    } else{
      console.log("Error processing response: ", response)
      throw new Error("Error processing response.")
    }

  } catch (errors) {
    const err = errors as Error
    const errorMessage = JSON.stringify(err.message, null, 2)
    console.error('Error listing QuickSight Namespaces: ', errorMessage);
    return {
      statusCode: 500,
      message: errorMessage,
      errorName: err.name,
      namespacesList: ""
    };
  }
};