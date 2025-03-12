import type { Schema } from "../../data/resource"
import { Amplify } from 'aws-amplify';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";

import { env } from '$amplify/env/publishRLS00ResourcesValidation';
import { GetDatabaseCommand, GlueClient } from "@aws-sdk/client-glue";
import { DescribeDataSourceCommand, QuickSightClient } from "@aws-sdk/client-quicksight";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

/**
 * Publich data to QuickSight with new DataSet Creation
 */
export const handler: Schema["publishRLS00ResourcesValidation"]["functionHandler"] = async ( event ) => {

  // console.info(`Start publishing RLS to QuickSight. Arguments: ${JSON.stringify(event.arguments)}`)

  const accountId = env.ACCOUNT_ID || null

  const region = event.arguments.region

  const s3BucketName = event.arguments.s3BucketName
  const glueDatabaseName = event.arguments.glueDatabaseName
  const qsDataSourceName = event.arguments.qsDataSourceName

  /**
   * Validating Arguments and Variables
   */
  try {
    if( ! accountId ){ throw new ReferenceError("Missing 'accountId' variable.") }
    if( ! region ){ throw new ReferenceError("Missing 'region'.") }
    if( ! s3BucketName ){ throw new ReferenceError("Missing tool Resource: s3BucketName") }
    if( ! glueDatabaseName ){ throw new ReferenceError("Missing tool Resource: glueDatabaseName") }
    if( ! qsDataSourceName){ throw new ReferenceError("Missing tool Resource: qsDataSourceName") }
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

  /**
   * S3 Bucket
   */
  const s3Client = new S3Client({ region: region });

  try {
    console.info("Checking that S3 Bucket " + s3BucketName + " exists.")

    const headCommand = new HeadBucketCommand({
      Bucket: s3BucketName,
    });

    const headResponse = await s3Client.send(headCommand)

    console.debug(headResponse)

    if(headResponse.$metadata.httpStatusCode != 200){
      console.error(headResponse)
      throw new Error("Unknown error on HeadBucket command.")
    }

    console.info("Bucket " + s3BucketName + " found.")

  }catch(e){
    console.error(e)
    if (e instanceof Error) {
      const errorMessage = `[${e.name}] Failed to check the S3 Bucket '${s3BucketName}': ${e.message}`
      let statusCode = 500
      let errorType = e.name

      switch (e.name) {
        case "Forbidden":
          statusCode = 403
          break
        case "NotFound":
          statusCode = 404
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
        message: `An unknown error occurred. Failed to check the S3 Bucket '${s3BucketName}'.`,
      };
    }
  }

  /**
   * Glue Database
   */
  const glueClient = new GlueClient({ region: region });

  try {
    console.info("Checking that Glue DB exists: " + glueDatabaseName)

    const glueGetDbCommand = new GetDatabaseCommand({
      Name: glueDatabaseName
    })

    const getDatabaseResponse = await glueClient.send(glueGetDbCommand)

    console.debug(getDatabaseResponse)

    if(getDatabaseResponse.$metadata.httpStatusCode != 200){
      console.error(getDatabaseResponse)
      throw new Error("Unknown error on GetDatabase command.")
    }

    console.info("Glue Database: " + glueDatabaseName + " exists.")

  }catch(e){
    console.error(e)
    if (e instanceof Error) {
      const errorMessage = `[${e.name}] Failed to check the Glue Database '${glueDatabaseName}': ${e.message}`
      let statusCode = 500
      let errorType = e.name

      switch (e.name) {
        case "OperationTimeoutException":
          statusCode = 504
          break
        case "EntityNotFoundException":
          statusCode = 404
          break
        case "InvalidInputException":
          statusCode = 400
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
      };
    }
  }

  /**
   * QuickSight DataSource
   */

  const quicksightClient = new QuickSightClient({ region: region });
  
  try {
    console.info("Checking that QuickSight DataSource exists: " + qsDataSourceName)

    const describeDataSourceCommand = new DescribeDataSourceCommand({
      AwsAccountId: accountId,
      DataSourceId: qsDataSourceName
    })

    const describeDataSourceResponse = await quicksightClient.send(describeDataSourceCommand)

    console.debug(describeDataSourceResponse)

    if(describeDataSourceResponse.$metadata.httpStatusCode != 200){
      throw new Error("Unknown error on DescribeDataSource command.")
    }

    console.info("QuickSight DataSource: " + qsDataSourceName + " exists.")

  }catch(e){
    console.error(e)
    if (e instanceof Error) {
      const errorMessage = `[${e.name}] Failed to check the QuickSight DataSource '${qsDataSourceName}': ${e.message}`
      let statusCode = 500
      let errorType = e.name

      switch (e.name) {
        case "AccessDeniedException":
          statusCode = 403
          break
        case "InternalFailureException":
          statusCode = 500
          break
        case "InvalidParameterValueException":
          statusCode = 400
          break
        case "ResourceNotFoundException":
          statusCode = 404
          break
        case "ThrottlingException":
          statusCode = 429
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
      };
    }
  
  }

  /**
   * All check completed. Return 200.
   */
  return {
    statusCode: 200,
    message: "RLS Tool Resources correctly validated.",
  }
}