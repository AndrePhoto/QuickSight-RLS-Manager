import type { Schema } from "../../data/resource"
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { GlueClient, CreateTableCommand, GetTablesCommand, GetDatabaseCommand, GetTableCommand, UpdateTableCommand } from "@aws-sdk/client-glue"; // ES Modules import

import { env } from '$amplify/env/publishRLS02Glue';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * Publich data to QuickSight with new DataSet Creation
 */
export const handler: Schema["publishRLS02Glue"]["functionHandler"] = async ( event ) => {

  const accountId = env.ACCOUNT_ID

  const region = event.arguments.region
  const s3BucketName = event.arguments.s3BucketName
  const glueDatabaseName = event.arguments.glueDatabaseName

  const dataSetId = event.arguments.dataSetId
  const csvColumns = event.arguments.csvColumns

  /**
   * Validating Arguments and Variables
   */
  try {
    if( ! accountId ){ throw new ReferenceError("Missing 'accountId' variable.") }
    if( ! region ){ throw new ReferenceError("Missing 'region'.") }
    if( ! dataSetId ){ throw new ReferenceError("Missing DataSet Id") }
    if( ! s3BucketName ){ throw new ReferenceError("Missing tool Resource: s3BucketName") }
    if( ! glueDatabaseName ){ throw new ReferenceError("Missing tool Resource: glueDatabaseName") }
    if( ! csvColumns || csvColumns.length === 0){ throw new ReferenceError("Missing CSV Columns") }

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
 
  const glueTableName = `qs-rls-${dataSetId}`
  const glueTableLocation = `s3://${s3BucketName}/RLS-Datasets/${dataSetId}/`
  const glueTableDescription = `QS-RLS Table created for DataSetId: ${dataSetId}`

  /**
   * Create or Update Glue Table
   */
  const glueClient = new GlueClient({ region: region });

  // Check if Glue Table already exists in the specific Glue DataBase
  console.info(`Checking if Glue Table '${glueTableName}' already exists in Glue Database '${glueDatabaseName}'`)

  let glueTableExists = false
  let doNotReturn = false

  try{
    const glueGetTableCommand = new GetTableCommand({
      DatabaseName: glueDatabaseName,
      Name: glueTableName
    })

    const checkTableResponse = await glueClient.send(glueGetTableCommand)

    if(checkTableResponse.$metadata.httpStatusCode != 200){
      console.error(checkTableResponse)
      throw new Error(`Unknown Error checking if Glue Table '${glueTableName}' already exists in Glue Database '${glueDatabaseName}'`)
    }else{
      glueTableExists = true
      console.info(`Glue Table '${glueTableName}' already exists in Glue Database '${glueDatabaseName}'. Proceeding to update it.`)
    }

  }catch(e){

    if(e instanceof Error) {
      const errorMessage = `[${e.name}] File checkiing if Glue Table ${glueTableName} exists: ${e.message}`
      let statusCode = 500
      let errorType = e.name

      switch (e.name) {
        case "EntityNotFoundException":
          console.warn(`[${e.name}] Glue Table '${glueTableName}' not found in Glue Database '${glueDatabaseName}'. Proceeding to create it.`)
          glueTableExists = false
          doNotReturn = true
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
      if(!doNotReturn){
        console.error(errorMessage)
        return {
          statusCode: statusCode,
          errorType: errorType,
          message: errorMessage,
          csvColumns: [],
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

  // Creating Table Input
  const tableInput = {
    CatalogId: accountId,
    DatabaseName: glueDatabaseName,
    TableInput: {
      Name: glueTableName,
      Description: glueTableDescription,
      StorageDescriptor: {
        Columns: csvColumns
        .filter((columnName): columnName is string => columnName !== null)
        .map(columnName => ({
            Name: columnName,
            Type: 'STRING'
        })),
        Location: glueTableLocation,
        InputFormat: 'org.apache.hadoop.mapred.TextInputFormat',
        OutputFormat: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
        SerdeInfo: {
          SerializationLibrary: 'org.apache.hadoop.hive.serde2.OpenCSVSerde',
          Parameters: {
            'separatorChar':',',
            'quoteChar':'"',
            'skip.header.line.count': '1',
          }
        }
      },
    }
  }

  // Create or Update the Glue Table

  try {
    if(glueTableExists){
      const updateTableCommand = new UpdateTableCommand(tableInput);

      const updateTableResponse = await glueClient.send(updateTableCommand)
      
      if(updateTableResponse.$metadata.httpStatusCode != 200){
        console.error(updateTableResponse)
        throw new Error("Error updating the Glue Table")
      }
    }else{
      const createTableCommand = new CreateTableCommand(tableInput);

      const createTableResponse = await glueClient.send(createTableCommand)
      
      if(createTableResponse.$metadata.httpStatusCode != 200){
        console.error(createTableResponse)
        throw new Error("Error creating Glue Table")
      }
    }
  }catch(e){
    console.error(e)

    if (e instanceof Error) {
      const errorMessage = `[${e.name}] Failed uploading new CSV version of RLS Permissions: ${e.message}`
      let statusCode = 500
      let errorType = e.name

      switch (e.name) {
        case "AlreadyExistsException":
        case "ConcurrentModificationException":
        case "EntityNotFoundException":
        case "FederationSourceException":
        case "FederationSourceRetryableException":
        case "GlueEncryptionException":
        case "InvalidInputException":
        case "ResourceNotReadyException":
        case "ResourceNumberLimitExceededException":
          statusCode = 400
          break
        case "OperationTimeoutException":
          statusCode = 408
          break
        case "InternalServiceException":
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
        csvColumns: [],
      }
    } else {
      return {
        statusCode: 500,
        errorType: "UnknownError",
        message: "An unknown error occurred.",
      }
    }

  }

  console.info(`Glue Table '${glueTableName}' ${glueTableExists ? 'updated' : 'created'} successfully.`)

  return {
    statusCode: 200,
    message: `Glue Table '${glueTableName}' ${glueTableExists ? 'updated' : 'created'} successfully.`,
  }
}