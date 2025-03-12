import type { Schema } from "../../data/resource"
import { Amplify } from 'aws-amplify';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

import { env } from '$amplify/env/publishRLS01S3';

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

/**
 * Publich data to QuickSight with new DataSet Creation
 */
export const handler: Schema["publishRLS01S3"]["functionHandler"] = async ( event ) => {

  const accountId = env.ACCOUNT_ID || null

  const csvHeaders = event.arguments.csvHeaders
  const csvContent = event.arguments.csvContent
  const dataSetId = event.arguments.dataSetId
  const region = event.arguments.region
  const s3BucketName = event.arguments.s3BucketName

  /**
   * Validating Arguments and Variables
   */
  try {
    if( ! accountId ){ throw new ReferenceError("Missing 'accountId' variable.") }
    if( ! region ){ throw new ReferenceError("Missing 'region'.") }
    if( ! s3BucketName ){ throw new ReferenceError("Missing tool Resource: s3BucketName") }
    if( ! csvHeaders || csvHeaders.length === 0){ throw new ReferenceError("Missing CSV Headers") }
    if( ! csvContent ){ throw new ReferenceError("Missing CSV Content") }
    if( ! dataSetId ){ throw new ReferenceError("Missing DataSet Id") }
  }catch(e){
    console.error(e)
    if( e instanceof ReferenceError ){
      console.error("[ReferenceError]: Error validating the input variables. " + e.message )
      return {
        statusCode: 400,
        message: "Error validating the input variables. " + e.message,
        csvColumns: [],
        errorType: "ReferenceError"
      }
    
    }else{
      console.error(e)
      return {
        statusCode: 500,
        message: "Unknown Error. Please check the logs.",
        csvColumns: [],
        errorType: "UnknownError"
      }
    }
  }

  const csvFileName = `QS_RLS_Managed_${dataSetId}.csv`
  const s3Key = `RLS-Datasets/${dataSetId}/${csvFileName}`

  /**
   * CSV Headers: Get valid columns
   */
  const validColumns = csvHeaders
  .filter((columnName): columnName is string => 
    columnName !== null && 
    columnName !== undefined && 
    columnName.trim() !== ''
  );

  // Remove duplicates
  const uniqueColumns = [...new Set(validColumns)];

  // Check if we have any valid columns after filtering
  if (uniqueColumns.length === 0) {
    return {
      statusCode: 500,
      message: "No valid CSV Headers found.",
      csvColumns: [],
      errorType: "NoValidCSVHeaders"
    }
  }

  /**
   * S3 Bucket
   */
  const s3Client = new S3Client({ region: region });

  try{// Put new CSV file in Bucket
    console.info("Creating CSV file " + csvFileName + " in S3 Bucket " + s3BucketName)

    const putCommand = new PutObjectCommand({
      Bucket: s3BucketName,
      Key: s3Key,
      Body: csvContent,
      ContentType: 'text/csv'
    }); 

    const putResponse = await s3Client.send(putCommand)

    console.debug(putResponse)

    if(putResponse.$metadata.httpStatusCode != 200){
      console.error(putResponse)
      throw new Error("Unknown Error creating S3 Folder & csv File")
    }

    console.info("CSV File created successfully. Key: " + s3BucketName + "/" + s3Key)

  }catch(e){
    console.error(e)

    if (e instanceof Error) {
      const errorMessage = `[${e.name}] Failed uploading new CSV version of RLS Permissions: ${e.message}`
      let statusCode = 500
      let errorType = e.name

      switch (e.name) {
        case "EncryptionTypeMismatch":
        case "InvalidRequest":
        case "InvalidWriteOffset":
          statusCode = 400
          break
        case "TooManyParts":
          statusCode = 413
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
        csvColumns: []
      }
    }
  }

  return {
    statusCode: 200,
    message: "CSV file uploaded successfully.",
    csvColumns: uniqueColumns
  }
}