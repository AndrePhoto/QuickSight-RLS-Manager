// Create a function that, with SDK, creates a bucket in an AWS region gives as argumenet. In output the bucket name is returned
import type { Schema } from "../../data/resource"
import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import {v4 as uuidv4} from 'uuid';

import { env } from '$amplify/env/createS3Bucket';

import { S3Client, CreateBucketCommand, BucketLocationConstraint } from "@aws-sdk/client-s3";

const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env);
 
Amplify.configure(resourceConfig, libraryOptions);

export const handler: Schema["createS3Bucket"]["functionHandler"] = async ( event ) => {

  const AWS_ACCOUNT = env.ACCOUNT_ID
  const BUCKET_REGION = event.arguments.region

  console.log("Creating bucket for region: " + BUCKET_REGION)

  // create a randum uuid

  let uuid = uuidv4();
  const BUCKET_NAME = env.RESOURCE_PREFIX + uuid

  console.log("Bucket name: " + BUCKET_NAME)

  let createBucketCommand = new CreateBucketCommand({
    Bucket: BUCKET_NAME
  })

  if( BUCKET_REGION != "us-east-1"){
    createBucketCommand = new CreateBucketCommand({
      Bucket: BUCKET_NAME,
      CreateBucketConfiguration: {
        LocationConstraint: BUCKET_REGION as BucketLocationConstraint
      }
    })
  }

  console.log("Command: ")
  console.log(createBucketCommand)

  const s3Client = new S3Client({ region: BUCKET_REGION });

  const createBucketResponse = s3Client.send(createBucketCommand)

  if( (await createBucketResponse).$metadata.httpStatusCode === 200){
    console.log("Bucket created.")
    return {
      statusCode: 200,
      message: 'Bucket ' + BUCKET_NAME + ' created in Region ' + BUCKET_REGION + '.',
      s3BucketName: BUCKET_NAME
    }
  }else{
    console.log("Bucket not created")
    return {
      statusCode: 500,
      message: 'Failed to create the S3 Bucket in Region ' + BUCKET_REGION,
      s3BucketName: "",
      errorName: "BucketNotCreated"
    }
  }
}