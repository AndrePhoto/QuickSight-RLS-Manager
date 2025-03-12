import type { Schema } from "../../data/resource"
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import {v4 as uuidv4} from 'uuid';

import { env } from '$amplify/env/createQSDataSource';
import { CreateDataSourceCommand, DescribeDataSourceCommand, QuickSight } from "@aws-sdk/client-quicksight";


const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

export const handler: Schema["createQSDataSource"]["functionHandler"] = async ( event ) => {
  const AWS_ACCOUNT = env.ACCOUNT_ID
  const DATA_SOURCE_REGION = event.arguments.region

  try {

    console.log("Creating QuickSight DataSource for region: " + DATA_SOURCE_REGION)

    // create a randum uuid
    let uuid = uuidv4();
    const DATA_SOURCE_NAME = env.RESOURCE_PREFIX + uuid

    console.log("QuickSight DataSource name: " + DATA_SOURCE_NAME)

    
    let createDataSourceCommand = new CreateDataSourceCommand({
      AwsAccountId: AWS_ACCOUNT,
      DataSourceId: DATA_SOURCE_NAME,
      Name: 'QS Managed Data Source from Athena',
      Type: 'ATHENA',
      DataSourceParameters: {
        AthenaParameters: {
          WorkGroup: 'primary'
        }
      }
    })

    const quicksightClient = new QuickSight({ region: DATA_SOURCE_REGION });

    const createQsDataSourceResponse = await quicksightClient.send(createDataSourceCommand)

    if( ( createQsDataSourceResponse).$metadata.httpStatusCode === 202){
      console.log("QuickSight DataSource creation in progress.")

      let creationInProgress = true

      do {
        const describeDataSourceCommand = new DescribeDataSourceCommand({
          AwsAccountId: AWS_ACCOUNT,
          DataSourceId: DATA_SOURCE_NAME
        })

        const describeDataSourceResponse = await quicksightClient.send(describeDataSourceCommand)

        console.log(describeDataSourceResponse)

        if( describeDataSourceResponse && describeDataSourceResponse.Status === 200 ){

          if( describeDataSourceResponse.DataSource?.Status === "CREATION_IN_PROGRESS"){
            creationInProgress = true
            await new Promise(resolve => setTimeout(resolve, 1000));
          }else if (describeDataSourceResponse.DataSource?.Status === "CREATION_SUCCESSFUL"){
            creationInProgress = false
            console.log("QuickSight DataSource created.")
          }else{
            creationInProgress = false
            console.log("QuickSight DataSource creation failed.")
            throw new Error("QuickSight DataSource creation failed.")
          }

        }

      }while(creationInProgress)


      return {
        statusCode: 200,
        message: 'QuickSight DataSource ' + DATA_SOURCE_NAME + ' created in Region ' + DATA_SOURCE_REGION + '.',
        qsDataSourceName: DATA_SOURCE_NAME
      }
    }else{
      console.log("QuickSight DataSource not created")
      console.log(createQsDataSourceResponse)
      return {
        statusCode: 500,
        message: 'Failed to create the QuickSight DataSource in Region ' + DATA_SOURCE_REGION,
        qsDataSourceName: "",
        errorName: "QsDataSourceError"
      }
    }
  } catch (err){


    console.log(err)

    return {
      statusCode: 500,
      message: 'Failed to create the QuickSight DataSource in Region ' + DATA_SOURCE_REGION,
      qsDataSourceName: "",
      errorName: "QsDataSourceError"
    } 
  }
}