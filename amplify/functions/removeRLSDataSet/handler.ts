import type { Schema } from "../../data/resource";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { env } from '$amplify/env/removeRLSDataSet';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import { QuickSightClient, DescribeDataSetCommand, UpdateDataSetCommand } from "@aws-sdk/client-quicksight";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 */
export const handler: Schema["removeRLSDataSet"]["functionHandler"] = async ( event ) => {
  
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
    const command = new DescribeDataSetCommand({
      AwsAccountId: accountId,
      DataSetId: dataSetId
    });

    // Execute the command
    const response = await quicksightClient.send(command);
    console.log( "Processing response" )

    if( response.DataSet && response.Status === 200 ){
      const dataSetDetails = response.DataSet
      const updateDataSetCommand = new UpdateDataSetCommand({
        AwsAccountId: accountId,
        DataSetId: dataSetId,
        Name: dataSetDetails.Name,
        PhysicalTableMap: dataSetDetails.PhysicalTableMap,
        LogicalTableMap: dataSetDetails.LogicalTableMap,
        ImportMode: dataSetDetails.ImportMode,
        // RowLevelPermissionDataSet: REMOVED,
        ...(dataSetDetails.RowLevelPermissionTagConfiguration && {RowLevelPermissionTagConfiguration: dataSetDetails.RowLevelPermissionTagConfiguration}),
        ...(dataSetDetails.PerformanceConfiguration && {PerformanceConfiguration: dataSetDetails.PerformanceConfiguration}),
        ...(dataSetDetails.FieldFolders && {FieldFolders: dataSetDetails.FieldFolders}),
        ...(dataSetDetails.DataSetUsageConfiguration && {DataSetUsageConfiguration: dataSetDetails.DataSetUsageConfiguration}),
        ...(dataSetDetails.DatasetParameters && {DatasetParameters: dataSetDetails.DatasetParameters}),
        ...(dataSetDetails.ColumnLevelPermissionRules && {ColumnLevelPermissionRules: dataSetDetails.ColumnLevelPermissionRules}),
        ...(dataSetDetails.ColumnGroups && {ColumnGroups: dataSetDetails.ColumnGroups}),
      });

      const updateDataSetResponse = await quicksightClient.send(updateDataSetCommand)

      if(updateDataSetResponse.$metadata.httpStatusCode != 200 && updateDataSetResponse.$metadata.httpStatusCode != 201){
        console.error(updateDataSetResponse)
        throw new Error("Error updating QuickSight DataSet")
      }else if(updateDataSetResponse.$metadata.httpStatusCode == 200){
        console.info("QuickSight DataSet updated successfully.")
        return {
          statusCode: 200,
          message: "QuickSight DataSet updated successfully.",
        }
      }else if(updateDataSetResponse.$metadata.httpStatusCode == 201){
        if( ! updateDataSetResponse.IngestionId || updateDataSetResponse.IngestionId === "" || updateDataSetResponse.IngestionId == null ){
          console.error("No IngestionId found.", "ERROR", 404, "QuickSightError")
          throw new Error("No IngestionId found.")
        }else{
          console.info("QuickSight DataSet updating in progress.")
          ingestionId = updateDataSetResponse.IngestionId

          console.debug("ingestionId: " + ingestionId)
          console.debug(updateDataSetResponse)
          
          return {
            statusCode: 201,
            message: "QuickSight DataSet updating in progress.",
            ingestionId: ingestionId
          }
        }
      }
    }

    return {
      statusCode: 500,
      message: "You shouldn't be here. Why are you here? Damn.",
    }

  } catch (error) {
    const err = error as Error
    console.error('Error fetching QuickSight Dataset Fields:', error);
    if(err.message === "The data set type is not supported through API yet"){
      return {
        statusCode: 999,
        message: err.message,
        errorType: "NotManageable"
      };
   
    }
    return {
      statusCode: 500,
      message: 'Error fetching QuickSight Dataset Fields: ' + err.message,
      errorType: "GenericError"
    };
  }
};