import type { Schema } from "../../data/resource"
import { CreateDataSetCommand, CreateDataSetCommandInput, DescribeDataSetCommand, DescribeDataSourceCommand, QuickSightClient, UpdateDataSetCommand } from "@aws-sdk/client-quicksight";
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import {v4 as uuidv4} from 'uuid';

import { env } from '$amplify/env/publishRLS03QsRLSDataSet';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * Publich data to QuickSight with new DataSet Creation
 */
export const handler: Schema["publishRLS03QsRLSDataSet"]["functionHandler"] = async ( event ) => {
  const accountId = env.ACCOUNT_ID

  const region = event.arguments.region

  const glueDatabaseName = event.arguments.glueDatabaseName
  const qsDataSourceName = event.arguments.qsDataSourceName

  const dataSetId = event.arguments.dataSetId
  const csvColumns = event.arguments.csvColumns

  const rlsDataSetArn = event.arguments.rlsDataSetArn
  const rlsToolManaged = event.arguments.rlsToolManaged || false

  /** 
   * Validating Arguments and Variables
   */
  console.info("Validating arguments and environment variables.")
  
  try {
    if( ! accountId ){ throw new ReferenceError("Missing 'accountId' variable.") }
    if( ! region ){ throw new ReferenceError("Missing 'region' argument.") }
    if( ! glueDatabaseName || ! qsDataSourceName){ throw new ReferenceError("Missing tool Resources.") }
    if( ! dataSetId ){ throw new ReferenceError("Missing 'dataSetId' argument.") }
    if( ! csvColumns || csvColumns.length == 0 ){ throw new ReferenceError("Missing 'csvColumns' argument.") }
    if( rlsToolManaged == null || rlsToolManaged == undefined ){ throw new ReferenceError("Missing 'rlsToolManaged' argument.") }
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

  const qsDataSetName = `Amplify-Managed-RLS for DataSetId: ${dataSetId}`

  /**
   * QuickSight
   */

  const quicksightClient = new QuickSightClient({ region: region });

  let ingestionId = "" 

  try{

    const newDataSetuuid = uuidv4();

    const dataSetParams = {
      AwsAccountId: accountId,
      DataSetId: `RLS-${newDataSetuuid}`, // ID of the RLS DataSet
      Name: qsDataSetName,
      ImportMode: 'SPICE',
      PhysicalTableMap: {
        [newDataSetuuid]: {
          RelationalTable: {
            DataSourceArn: `arn:aws:quicksight:${region}:${accountId}:datasource/${qsDataSourceName}`,
            Name: `qs-rls-${dataSetId}`,
            Catalog: "AwsDataCatalog",
            Schema: glueDatabaseName,
            InputColumns: csvColumns.map(columnName => ({
              Name: columnName,
              Type: 'STRING'
            }))
          }
        }
      }
    }

    let create = false // True = Create, False = Update

    if( rlsToolManaged ){
      if( ! rlsDataSetArn || rlsDataSetArn === "" ){ throw new ReferenceError("Trying to update the RLS DataSet, but missing 'rlsDataSetArn' argument.") }

      try {
        console.log("DataSet to be secured is indicated as Tool Managed. Checking if RLS DataSet with ARN '" + rlsDataSetArn + "' really exists")
        const rlsDataSetIdSplit = rlsDataSetArn.split("/")
        const rlsDataSetIdExtracted = rlsDataSetIdSplit[rlsDataSetIdSplit.length - 1]

        const getRLSDataSetInfoCommand = new DescribeDataSetCommand({
          AwsAccountId: accountId,
          DataSetId: rlsDataSetIdExtracted
        })

        const rlsDataSetInfoResponse = await quicksightClient.send(getRLSDataSetInfoCommand)

        if(rlsDataSetInfoResponse.Status == 200){
          console.log("RLS DataSet with ARN '" + rlsDataSetArn + "' exists. Proceeding to update the RLS DataSet.")
        }else{
          throw new Error("Failed to check RLS DataSet.")
        }

      }catch(e){
        if(e instanceof Error) {
          const errorMessage = `[${e.name}] Creating or Updating RLS DataSet failed: ${e.message}`
          let statusCode = 500
          let errorType = e.name
    
          switch (e.name) {
            case "ResourceNotFoundException": // THIS IS THE INTERESTING PART.
              statusCode = 404
              break
            case "InvalidParameterValueException":
              statusCode = 400
              break
            case "AccessDeniedException":
              statusCode = 401
              break
            case "UnsupportedUserEditionException":
              statusCode = 403
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

          if( statusCode == 404 ){
            console.info("DataSet RLS is set to " + rlsDataSetArn + ", but this RLS DataSet does not exists in QuickSight. Proceeding to create a RLS DataSet.")
            create = true
          }else{
            console.error("Failed to check if RLS DataSet assigned to DataSet to be Secured really exists.")
            console.error(errorMessage)
            return {
              statusCode: statusCode,
              errorType: errorType,
              message: errorMessage,
            }
          }
        } else {
          return {
            statusCode: 500,
            errorType: "UnknownError",
            message: "An unknown error occurred.",
          }
        }
      }

    }else{
      create = true
    }

    if( ! create ){
      // You can manually refresh datasets in an Enterprise edition account 32 times in a 24-hour period. 
      // You can manually refresh datasets in a Standard edition account 8 times in a 24-hour period. 
      // Each 24-hour period is measured starting 24 hours before the current date and time.

      if( ! rlsDataSetArn || rlsDataSetArn === "" ){ throw new ReferenceError("Trying to update the RLS DataSet, but missing 'rlsDataSetArn' argument.") }



      console.info("Updating RLS DataSet: " + rlsDataSetArn)

      // extract the ID from the ARN in the variable: rlsDataSetId. Get the last part of the split
      const rlsDataSetIdSplit = rlsDataSetArn.split("/")
      const rlsDataSetIdExtracted = rlsDataSetIdSplit[rlsDataSetIdSplit.length - 1]

      dataSetParams.DataSetId = rlsDataSetIdExtracted

      const updateRLSDataSetCommand = new UpdateDataSetCommand(dataSetParams as CreateDataSetCommandInput)

      const updateRLSDataSetResponse = await quicksightClient.send(updateRLSDataSetCommand)

      if(updateRLSDataSetResponse.$metadata.httpStatusCode != 200 && updateRLSDataSetResponse.$metadata.httpStatusCode != 201){
        console.error(updateRLSDataSetResponse)
        throw new Error("Error updating QuickSight RLS DataSet")
      }else if(updateRLSDataSetResponse.$metadata.httpStatusCode == 200){
        if( ! updateRLSDataSetResponse.Arn || updateRLSDataSetResponse.Arn === "" || updateRLSDataSetResponse.Arn == null || updateRLSDataSetResponse.Arn == undefined){
          console.error("No Arn found.", "ERROR", 404, "QuickSightError")
          throw new Error("No Arn found.")
        }else{
          console.info("QuickSight RLS DataSet updated successfully.")
          return {
            statusCode: 200,
            message: "QuickSight RLS DataSet updated successfully.",
            rlsDataSetArn: updateRLSDataSetResponse.Arn
          }
        }
      }else if(updateRLSDataSetResponse.$metadata.httpStatusCode == 201){
        if( ! updateRLSDataSetResponse.IngestionId || updateRLSDataSetResponse.IngestionId === "" || updateRLSDataSetResponse.IngestionId == null ){
          console.error("No IngestionId found.", "ERROR", 404, "QuickSightError")
          throw new Error("No IngestionId found.")
        }else if( ! updateRLSDataSetResponse.Arn || updateRLSDataSetResponse.Arn === "" || updateRLSDataSetResponse.Arn == null ){
          console.error("No Arn found.", "ERROR", 404, "QuickSightError")
          throw new Error("No Arn found.")
        }else{
          console.info("QuickSight RLS DataSet updating in progress.")
          ingestionId = updateRLSDataSetResponse.IngestionId

          console.debug("ingestionId: " + ingestionId)
          console.debug(updateRLSDataSetResponse)
          
          return {
            statusCode: 201,
            message: "QuickSight RLS DataSet updating in progress.",
            rlsDataSetArn: updateRLSDataSetResponse.Arn,
            ingestionId: ingestionId
          }
        }
      }

    }else if ( create ){
      console.info("Creating QuickSight RLS DataSet")

      const createDataSetCommand = new CreateDataSetCommand(dataSetParams as CreateDataSetCommandInput)

      const createDataSetResponse = await quicksightClient.send(createDataSetCommand)

      if(createDataSetResponse.$metadata.httpStatusCode != 200 && createDataSetResponse.$metadata.httpStatusCode != 201){
        console.error(createDataSetResponse)
        throw new Error("Error creating QuickSight RLS DataSet")
      }else if(createDataSetResponse.$metadata.httpStatusCode == 200){
        if( ! createDataSetResponse.DataSetId ){
          console.error(createDataSetResponse)
          throw new Error("No DataSet ID Returned.")
        }else if (! createDataSetResponse.Arn || createDataSetResponse.Arn === "" || createDataSetResponse.Arn == null ){
          console.error(createDataSetResponse)
          throw new Error("No ARN returned.")
        }
        console.info("QuickSight RLS DataSet created successfully.")
        return {
          statusCode: 200,
          message: "QuickSight RLS DataSet created successfully.",
          rlsDataSetArn: createDataSetResponse.Arn
        }
      }else if(createDataSetResponse.$metadata.httpStatusCode == 201){
        if( ! createDataSetResponse.DataSetId ){
          console.error(createDataSetResponse)
          throw new Error("No DataSet ID Returned.")
        }else if (! createDataSetResponse.Arn || createDataSetResponse.Arn === "" || createDataSetResponse.Arn == null ){
          console.error(createDataSetResponse)
          throw new Error("No ARN returned.")
        }else  if( ! createDataSetResponse.IngestionId || createDataSetResponse.IngestionId === "" || createDataSetResponse.IngestionId == null ){
          console.error("No IngestionId found.")
          throw new Error("No IngestionId found.")
        }else{
          console.info("QuickSight RLS DataSet creation in progress.")
          ingestionId = createDataSetResponse.IngestionId

          console.debug("ingestionId: " + ingestionId)
          console.debug(createDataSetResponse)
          
          return {
            statusCode: 201,
            message: "QuickSight RLS DataSet creation in progress.",
            rlsDataSetArn: createDataSetResponse.Arn,
            ingestionId: ingestionId
          }
        }
      }
    }else{
      console.error("Unknown error.")
      throw new Error("Unknown error.")
    }

  }catch(e){

    if(e instanceof Error) {
      const errorMessage = `[${e.name}] Creating or Updating RLS DataSet failed: ${e.message}`
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
          statusCode = 404
          break
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

  return {
    statusCode: 500,
    message: "You shouldn't be here. Why are you here? Damn.",
  }
}