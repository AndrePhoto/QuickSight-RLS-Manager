import type { Schema } from "../../data/resource"
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';

import { env } from '$amplify/env/deleteDataSetS3Objects';
import { DeleteObjectCommand, ListObjectsCommand, S3Client } from "@aws-sdk/client-s3";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

/**
 * Publich data to QuickSight with new DataSet Creation
 */
export const handler: Schema["deleteDataSetS3Objects"]["functionHandler"] = async ( event ) => {

  const accountId = env.ACCOUNT_ID

  const region = event.arguments.region
  const s3BucketName = event.arguments.s3BucketName

  const s3Key = event.arguments.s3Key

  /**
   * Validating Arguments and Variables
   */
  try {
    if( ! accountId ){ throw new ReferenceError("Missing 'accountId' variable.") }
    if( ! region ){ throw new ReferenceError("Missing 'region'.") }
    if( ! s3Key ){ throw new ReferenceError("Missing s3Key") }
    if( ! s3BucketName ){ throw new ReferenceError("Missing tool Resource: s3BucketName") }

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
 
  const s3Path = `RLS-Datasets/${s3Key}`

  /**
   * Create or Update Glue Table
   */
  const s3Client = new S3Client({ region: region });

  try{

    // delete all s3 objects from s3BucketName/s3Path and then remove also the containing folder
    const listParams = {
      Bucket: s3BucketName,
      Prefix: s3Path
    };
    const listedObjects = await s3Client.send(new ListObjectsCommand(listParams));
    if (listedObjects.Contents) {
      const deletePromises = listedObjects.Contents.map(async (object) => {
        const deleteParams = {
          Bucket: s3BucketName,
          Key: object.Key
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      });
      await Promise.all(deletePromises);
    }
    if (listedObjects.CommonPrefixes) {
      const deletePromises = listedObjects.CommonPrefixes.map(async (prefix) => {
        const deleteParams = {
          Bucket: s3BucketName,
          Key: prefix.Prefix
        };
        await s3Client.send(new DeleteObjectCommand(deleteParams));
      });
      await Promise.all(deletePromises);
    }
    if (listedObjects.Contents?.length === 0 && listedObjects.CommonPrefixes?.length === 0) {
      return {
        statusCode: 404,
        message: `S3 folder '${s3Path}' not found.`,
      }
    }
    return {
      statusCode: 200,
      message: `S3 folder '${s3Path}' deleted successfully.`,
    }



  }catch(e){

    if(e instanceof Error) {
      const errorMessage = `[${e.name}] Error deleting S3 ${s3Path}`
      let statusCode = 500
      let errorType = e.name

      switch (e.name) {
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
    } else {
      return {
        statusCode: 500,
        errorType: "UnknownError",
        message: "An unknown error occurred.",
      }
    }

  }

  return {
    statusCode: 200,
    message: `S3 folder '${s3Path}' deleted successfully.`,
  }
}