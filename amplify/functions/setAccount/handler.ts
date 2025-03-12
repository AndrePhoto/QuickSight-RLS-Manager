import type { Schema } from "../../data/resource";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/setAccount';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * INIT function will be launched only at the first access
 */
export const handler: Schema["setAccount"]["functionHandler"] = async ( event ) => {

  console.log("Trying to add backend resources info to AccountDetails schema")

  try {
    // Fetching info from Environment Variables
    const accountId = env.ACCOUNT_ID || null
    // QuickSight Management Region is set in the Front-End
    const qsManagementRegion = event.arguments.qsManagementRegion
     // QuickSight Resources Counter - To be updated after init and resources check.
    const namespacesCount = event.arguments.namespacesCount || 0
    const groupsCount = event.arguments.groupsCount || 0
    const usersCount = event.arguments.usersCount || 0 

    // If Environment Variables have failed to load, or in the QuickSight Management Region is missing, then throw an Error
    if( ! accountId ){
      throw new Error("Missing environment variables")
    }
    if ( ! qsManagementRegion ){
      throw new Error("Missing qsManagementRegion variable")
    }

    const accountParams = {
      accountId: accountId,
      qsManagementRegion: qsManagementRegion,
      namespacesCount: namespacesCount,
      groupsCount: groupsCount,
      usersCount: usersCount,
    }

    // If the data already exists, then throw an Error
    const {data: response_CheckAccountDetails, errors} = await client.models.AccountDetails.get({ accountId: accountId })

    if( errors ){
      const errorMessage = errors.map(e => e.message).join(', ');
      throw new Error(errorMessage);
    }

    if( response_CheckAccountDetails ){
      // Updating the Account Details
      console.log("Account Details already exist. Updating the data.")
      const response_AccountDetails = await client.models.AccountDetails.update( accountParams )

      // If client.models.AccountDetails.create failed, raise the Error.
      if (response_AccountDetails.errors) {
        const errorMessage = response_AccountDetails.errors.map(e => e.message).join(', ');
        throw new Error(errorMessage);
      }
    } else{
      // First Init, create Account Details
      console.log("Account Details do not exist. Creating the data.")
      const response_AccountDetails = await client.models.AccountDetails.create( accountParams )

      // If client.models.AccountDetails.create failed, raise the Error.
      if (response_AccountDetails.errors) {
        const errorMessage = response_AccountDetails.errors.map(e => e.message).join(', ');
        throw new Error(errorMessage);
      }
    }

    // If the data have been created, give a success message.
    console.log("Succesfully initiated the QS RLS Managed Tool")
    return {
      statusCode: 200,
      message: 'Succesfully initiated the QS RLS Managed Tool',
    };

  }catch(err){
    const error = err as Error;

    console.error('Failed to Init the QS RLS Managed Tool:', {
      message: error.message,
      stack: error.stack
    });

    return {
      statusCode: 500,
      message: 'Failed to Init the Account',
      errorMessage: error.message,
      errorName: error.name,
    };
  }
}