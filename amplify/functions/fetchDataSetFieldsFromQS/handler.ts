import type { Schema } from "../../data/resource";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/fetchDataSetFieldsFromQS';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import { QuickSightClient, DescribeDataSetCommand } from "@aws-sdk/client-quicksight";

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
export const handler: Schema["fetchDataSetFieldsFromQS"]["functionHandler"] = async ( event ) => {

  console.log("Start to fetch Dataset Fields from QuickSight") 

  try {  
    // Check Environment Variables
    const accountId = env.ACCOUNT_ID || null
    const DATASETID = event.arguments.dataSetId
    const REGION = event.arguments.region

    // If Environment Variables have failed to load, or in the QuickSight Management Region is missing, then throw an Error
    if( ! accountId  ){
      throw new Error("Missing environment variables")
    }
    
    console.log("Fetching Fields for DataSet: " + DATASETID)

    // Initialize the QuickSight client
    const quicksightClient = new QuickSightClient({ region:  REGION });

    // Create the ListDatasets command
    const command = new DescribeDataSetCommand({
      AwsAccountId: accountId,
      DataSetId: DATASETID
    });
    // Execute the command
    const response = await quicksightClient.send(command);
    console.log( "Processing response" )

    if( response.DataSet && response.Status === 200 && response.DataSet?.OutputColumns){

      let outputFields = response.DataSet.OutputColumns.map((column: any) => column.Name);

      return {
        statusCode: 200,
        message: 'QuickSight Dataset Fields fetched successfully',
        datasetsFields: JSON.stringify(outputFields),
        spiceCapacityInBytes: response.DataSet.ConsumedSpiceCapacityInBytes || 0
      };
    } else{
      console.log("Error processing response: ", response)
      throw new Error("Error processing response.")
    }

  } catch (error) {
    const err = error as Error
    console.error('Error fetching QuickSight Dataset Fields:', error);
    if(err.message === "The data set type is not supported through API yet"){
      return {
        statusCode: 999,
        message: err.message,
        datasetsFields: "",
        spiceCapacityInBytes: 0
      };
   
    }
    return {
      statusCode: 500,
      message: 'Error fetching QuickSight Dataset Fields: ' + err.message,
      datasetsFields: "",
      spiceCapacityInBytes: 0,
      errorName: "GenericError"
    };
  }
};