import type { Schema } from "../../data/resource";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/checkQSManagementRegionAccess';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import { QuickSightClient, ListUsersCommand } from "@aws-sdk/client-quicksight";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

export const handler: Schema["checkQSManagementRegionAccess"]["functionHandler"] = async ( event ) => {

  console.log("Start checking QS Management Region access")

  try {  
    // Check Environment Variables
    const accountId = env.ACCOUNT_ID || null

    // If Environment Variables have failed to load, or in the QuickSight Management Region is missing, then throw an Error
    if( ! accountId ){
      throw new Error("Missing environment variables")
    }
    
    // Initialize the QuickSight client
    const quicksightClient = new QuickSightClient({ region:  event.arguments.qsManagementRegion });

    // Create the ListUsers command
    const command = new ListUsersCommand({
      AwsAccountId: accountId,
      MaxResults: parseInt(env.API_MAX_RESULTS),
      Namespace: 'default',
    });

    // Execute the command
    const response = await quicksightClient.send(command);
    console.log( "Processing response" )
    console.log( response )

    if( response.Status === 200){
      return {
        statusCode: 200,
        message: 'QuickSight Management Region: VERIFIED.',
      };
    } else{
      console.log("Error processing response: ", response)
      throw new Error("Error processing response. Try again.")
    }

  } catch (error: any) {
    const err = (error as Error)
    const statusCode = error?.$metadata?.httpStatusCode || 500;

    console.error('Fail to validate QuickSight Management Region. [' + statusCode + "]: " + err.message);
    console.error(err.stack)

    return {
      statusCode: statusCode,
      message: 'Fail to validate QuickSight Management Region',
      errorMessage: err.message,
      errorName: err.name
    };
  }
};