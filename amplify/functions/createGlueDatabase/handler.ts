import type { Schema } from "../../data/resource"
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import {v4 as uuidv4} from 'uuid';

import { env } from '$amplify/env/createGlueDatabase';

import { CreateDatabaseCommand, GlueClient } from "@aws-sdk/client-glue";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

// Initialize the Amplify Data client
const client = generateClient<Schema>();

export const handler: Schema["createGlueDatabase"]["functionHandler"] = async ( event ) => {

  const AWS_ACCOUNT = env.ACCOUNT_ID
  const DB_REGION = event.arguments.region

  console.log("Creating Glue Datbase for region: " + DB_REGION)

  // create a randum uuid
  let uuid = uuidv4();
  const GLUE_DB_NAME = env.RESOURCE_PREFIX + uuid

  console.log("Glue Database name: " + GLUE_DB_NAME)

  let createGlueDatabaseCommand = new CreateDatabaseCommand({
    DatabaseInput: {
      Name: GLUE_DB_NAME,
      Description: "Database created by QuickSight Managed RLS Tool",
    }
  })

  console.log("Command: ")
  console.log(createGlueDatabaseCommand)

  const glueClient = new GlueClient({ region: DB_REGION });

  const createGlueDBResponse = glueClient.send(createGlueDatabaseCommand)

  if( (await createGlueDBResponse).$metadata.httpStatusCode === 200){
    console.log("Glue Datbase created.")
    return {
      statusCode: 200,
      message: 'Glue Datbase ' + GLUE_DB_NAME + ' created in Region ' + DB_REGION + '.',
      glueDatabaseName: GLUE_DB_NAME
    }
  }else{
    console.log("Glue Datbase not created")
    return {
      statusCode: 500,
      message: 'Failed to create the Glue Datbase in Region ' + DB_REGION,
      glueDatabaseName: "",
      errorName: "GlueDbNotCreated"
    }
  }
}