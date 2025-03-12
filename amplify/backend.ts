import { defineBackend} from '@aws-amplify/backend';
import { auth } from './auth/resource';
import { data } from './data/resource';
import * as iam from "aws-cdk-lib/aws-iam"

import { setAccount } from './functions/setAccount/resources';
import { fetchNamespacesFromQS } from './functions/fetchNamespacesFromQS/resources';
import { fetchGroupsFromQS } from './functions/fetchGroupsFromQS/resources';
import { fetchUsersFromQS } from './functions/fetchUsersFromQS/resources';
import { fetchDataSetsFromQS } from './functions/fetchDataSetsFromQS/resources';
import { fetchDataSetFieldsFromQS } from './functions/fetchDataSetFieldsFromQS/resources';
import { getQSSpiceCapacity } from './functions/getQSSpiceCapacity/resources';
// import { publishRLStoQuickSight } from './functions/publishRLStoQuickSight/resources';
import { createS3Bucket } from "./functions/createS3Bucket/resources"
import { createGlueDatabase } from "./functions/createGlueDatabase/resources"
import { createQSDataSource } from "./functions/createQSDataSource/resources"
import { checkQSManagementRegionAccess } from "./functions/checkQSManagementRegionAccess/resources"
import { publishRLS00ResourcesValidation } from "./functions/publishRLS00ResourcesValidation/resources"
import { publishRLS01S3 } from "./functions/publishRLS01S3/resources"
import { publishRLS02Glue } from "./functions/publishRLS02Glue/resources"
import { publishRLS03QsRLSDataSet } from "./functions/publishRLS03QsRLSDataSet/resources"
import { publishRLS99QsCheckIngestion } from "./functions/publishRLS99QsCheckIngestion/resources"
import { publishRLS04QsUpdateMainDataSetRLS } from "./functions/publishRLS04QsUpdateMainDataSetRLS/resources"

import { removeRLSDataSet } from "./functions/removeRLSDataSet/resources"
import { deleteDataSetFromQS } from "./functions/deleteDataSetFromQS/resources"
import { deleteDataSetGlueTable } from "./functions/deleteDataSetGlueTable/resources"
import { deleteDataSetS3Objects } from "./functions/deleteDataSetS3Objects/resources"

// Define Backend
const backend = defineBackend({
  auth,
  data,

  // LAMBDAS
  setAccount,
  fetchNamespacesFromQS,
  fetchGroupsFromQS,
  fetchUsersFromQS,
  fetchDataSetsFromQS,
  fetchDataSetFieldsFromQS,
  getQSSpiceCapacity,
  createS3Bucket,
  createGlueDatabase,
  createQSDataSource,
  checkQSManagementRegionAccess,
  // publishRLStoQuickSight,
  publishRLS00ResourcesValidation,
  publishRLS01S3,
  publishRLS02Glue,
  publishRLS03QsRLSDataSet,
  publishRLS99QsCheckIngestion,
  publishRLS04QsUpdateMainDataSetRLS,
  removeRLSDataSet,
  deleteDataSetFromQS,
  deleteDataSetGlueTable,
  deleteDataSetS3Objects
});

/**
 * Variables Definition
 */
const ACCOUNT_ID = backend.data.stack.account
const RESOURCE_PREFIX = "qs-managed-rls-"

const catalogArn = "arn:aws:glue:*:" + ACCOUNT_ID + ":catalog"
const dataBaseArn = "arn:aws:glue:*:" + ACCOUNT_ID + ":database/" + RESOURCE_PREFIX + "*"
const tablesArn = "arn:aws:glue:*:" + ACCOUNT_ID + ":table/" + RESOURCE_PREFIX + "*/*"

/** 
 * ---- Account ID Variable ----
 * Passing Account ID Environment Variable
 */
// Pass the AWS Account ID to the Lambdas
backend.setAccount.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.fetchNamespacesFromQS.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.fetchGroupsFromQS.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.fetchUsersFromQS.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.fetchDataSetsFromQS.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.fetchDataSetFieldsFromQS.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.getQSSpiceCapacity.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
// backend.publishRLStoQuickSight.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.createS3Bucket.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.createGlueDatabase.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.createQSDataSource.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.checkQSManagementRegionAccess.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.publishRLS00ResourcesValidation.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.publishRLS01S3.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.publishRLS02Glue.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.publishRLS03QsRLSDataSet.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.publishRLS99QsCheckIngestion.addEnvironment('ACCOUNT_ID', ACCOUNT_ID);
backend.publishRLS04QsUpdateMainDataSetRLS.addEnvironment('ACCOUNT_ID', ACCOUNT_ID)
backend.removeRLSDataSet.addEnvironment('ACCOUNT_ID', ACCOUNT_ID)
backend.deleteDataSetFromQS.addEnvironment('ACCOUNT_ID', ACCOUNT_ID)
backend.deleteDataSetGlueTable.addEnvironment('ACCOUNT_ID', ACCOUNT_ID)
backend.deleteDataSetS3Objects.addEnvironment('ACCOUNT_ID', ACCOUNT_ID)

/**
 * ---- Lambda: publishRLS00ResourcesValidation
 */

const publishRLS00ResourcesValidation_S3 = new iam.PolicyStatement({
  sid: "publishRLS00ResourcesValidationS3",
  actions: [
    "s3:ListBucket",
  ],
  resources: ['arn:aws:s3:::' + RESOURCE_PREFIX + '*',
    'arn:aws:s3:::' + RESOURCE_PREFIX + '*/*'
  ],
});

const publishRLS00ResourcesValidation_Glue = new iam.PolicyStatement({
  sid: "publishRLS00ResourcesValidationGlue",
  actions: [
    "glue:GetDatabase", 
  ],
  resources: [dataBaseArn,
    catalogArn,
    tablesArn
  ],
});

const publishRLS00ResourcesValidation_QuickSight = new iam.PolicyStatement({
  sid: "publishRLS00ResourcesValidationQuickSight",
  actions: [
    "quicksight:DescribeDataSource",
  ],
  resources: ["*"],
});
backend.publishRLS00ResourcesValidation.resources.lambda.addToRolePolicy(publishRLS00ResourcesValidation_S3)
backend.publishRLS00ResourcesValidation.resources.lambda.addToRolePolicy(publishRLS00ResourcesValidation_Glue)
backend.publishRLS00ResourcesValidation.resources.lambda.addToRolePolicy(publishRLS00ResourcesValidation_QuickSight)

/**
 * ---- Lambda: publishRLS01S3
 */
const publishRLS01S3_Policy = new iam.PolicyStatement({
  sid: "publishRLS01S3Policy",
  actions: [
    "s3:ListBucket",
    "s3:PutObject"
  ],
  resources: ['arn:aws:s3:::' + RESOURCE_PREFIX + '*',
    'arn:aws:s3:::' + RESOURCE_PREFIX + '*/*'
  ],
});
backend.publishRLS01S3.resources.lambda.addToRolePolicy(publishRLS01S3_Policy)

/**
 * ---- Lambda: publishRLS02Glue
 */
const publishRLS02Glue_Policy = new iam.PolicyStatement({
  sid: "publishRLS02GluePolicy",
  actions: [
    "glue:GetDatabase",
    "glue:GetTable",
    "glue:CreateTable",
    "glue:UpdateTable"
  ],
  resources: [
    dataBaseArn,
    catalogArn,
    tablesArn
  ],
});
backend.publishRLS02Glue.resources.lambda.addToRolePolicy(publishRLS02Glue_Policy)

/**
 * ---- Lambda: publishRLS03QsRLSDataSet
 * DescribeDataSetCommand
 * UpdateDataSetCommand
 * CreateDataSetCommand
 */
const publishRLS0Q3s_Policy = new iam.PolicyStatement({
  sid: "publishRLS0Q3sPolicy",
  actions: [
    "quicksight:PassDataSource",
    "quicksight:DescribeDataSource",
    "quicksight:CreateDataSet",
    "quicksight:DescribeDataSet",
    "quicksight:UpdateDataSet",
    "quicksight:PassDataSet",
    "quicksight:DescribeDataSource",
  ],
  resources: ["*"],
});
backend.publishRLS03QsRLSDataSet.resources.lambda.addToRolePolicy(publishRLS0Q3s_Policy)

/**
 * ---- Lambda: 
 *    - publishRLS04QsUpdateMainDataSetRLS
 *    - removeRLSDataSet
 * DescribeDataSetCommand
 * UpdateDataSetCommand
 */
const publishRLS04QsUpdateMainDataSetRLS_Policy = new iam.PolicyStatement({
  sid: "publishRLS04QsUpdateMainDataSetRLSPolicy",
  actions: [
    "quicksight:PassDataSource",
    "quicksight:DescribeDataSource",
    "quicksight:DescribeDataSet",
    "quicksight:UpdateDataSet",
    "quicksight:PassDataSet",
    "quicksight:DescribeDataSource",
  ],
  resources: ["*"],
});
backend.publishRLS04QsUpdateMainDataSetRLS.resources.lambda.addToRolePolicy(publishRLS04QsUpdateMainDataSetRLS_Policy)
backend.removeRLSDataSet.resources.lambda.addToRolePolicy(publishRLS04QsUpdateMainDataSetRLS_Policy)
backend.deleteDataSetFromQS.resources.lambda.addToRolePolicy(publishRLS04QsUpdateMainDataSetRLS_Policy)

/**
 * ---- Lambda: publishRLS99QsCheckIngestion
 * DescribeIngestionCommand
 */
const publishRLS99QsCheckIngestion_Policy = new iam.PolicyStatement({
  sid: "publishRLS99QsCheckIngestionPolicy",
  actions: [
    "quicksight:PassDataSource",
    "quicksight:DescribeDataSource",
    "quicksight:PassDataSet",
    "quicksight:UpdateDataSet",
    "quicksight:DescribeIngestion"
  ],
  resources: ["*"],
});
backend.publishRLS99QsCheckIngestion.resources.lambda.addToRolePolicy(publishRLS99QsCheckIngestion_Policy)

/**
 * ---- Lambda: deleteDataSetFromQS
 * DeleteDataSetCommand
 */
const deleteDataSetFromQS_Policy = new iam.PolicyStatement({
  sid: "deleteDataSetFromQSRLSPolicy",
  actions: [
    "quicksight:DeleteDataSet"
  ],
  resources: ["*"],
});
backend.deleteDataSetFromQS.resources.lambda.addToRolePolicy(deleteDataSetFromQS_Policy)

/**
 * ---- Lambda: deleteDataSetGlueTable
 * DeleteTableCommand
 */
const deleteDataSetGlueTable_Policy = new iam.PolicyStatement({
  sid: "deleteDataSetGlueTablePolicy",
  actions: [
    "glue:DeleteTable",
    "glue:GetDatabase",
    "glue:GetTable",
  ],
  resources: [    
    dataBaseArn,
    catalogArn,
    tablesArn
  ]
});
backend.deleteDataSetGlueTable.resources.lambda.addToRolePolicy(deleteDataSetGlueTable_Policy)

/**
 * ---- Lambda: deleteDataSetS3Objects
 * ListObjectsCommand
 * DeleteObjectsCommand
 */
const deleteDataSetS3Objects_Policy = new iam.PolicyStatement({
  sid: "deleteDataSetS3ObjectsPolicy",
  actions: [
    "s3:ListBucket",
    "s3:DeleteObject"
  ],
  resources: ['arn:aws:s3:::' + RESOURCE_PREFIX + '*',
    'arn:aws:s3:::' + RESOURCE_PREFIX + '*/*'
  ],
});
backend.deleteDataSetS3Objects.resources.lambda.addToRolePolicy(deleteDataSetS3Objects_Policy)

/**
 * ---- S3 ----
 * S3 Bucket Policy that will be used in every Active Region. Bucket Name will always start with qs-managed-rls-*
 */

const s3RegionalPolicyStatement = new iam.PolicyStatement({
  sid: "S3",
  actions: [
    "s3:PutObject",
    "s3:GetObject",
    "s3:DeleteObjectVersion",
    "s3:GetObjectAttributes",
    "s3:ListBucket",
    "s3:DeleteObject",
    "s3:CreateBucket"
  ],
  resources: ['arn:aws:s3:::' + RESOURCE_PREFIX + '*',
    'arn:aws:s3:::' + RESOURCE_PREFIX + '*/*'
  ],
});
backend.createS3Bucket.resources.lambda.addToRolePolicy(s3RegionalPolicyStatement)
backend.createS3Bucket.addEnvironment('RESOURCE_PREFIX', RESOURCE_PREFIX)

/**
 * ---- Glue ----
 * Glue Policy for Catalog, Database and Tables
 */


// Give permissions only on the created Glue Database
const glueRegionalPolicyStatement = new iam.PolicyStatement({
  sid: "Glue",
  actions: ["glue:*"],
  resources: [dataBaseArn,
    catalogArn,
    tablesArn
  ],
});

backend.createGlueDatabase.resources.lambda.addToRolePolicy(glueRegionalPolicyStatement)
backend.createGlueDatabase.addEnvironment('RESOURCE_PREFIX', RESOURCE_PREFIX)

/**
 * ---- QuickSight Data Source
 * Create the QuickSight Data Source for Athena that will be used to fetch the RLS values from the different tables.
 */
// ---- QuickSight Write Policy to create DataSets for Lambdas ----
const qsRegionalWriteDataSourcePolicy = new iam.PolicyStatement({
  sid: "WriteQuicksight",
  actions: [
    "quicksight:CreateDataSource",
    "quicksight:UpdateDataSource",
    "quicksight:DeleteDataSource",
    "quicksight:PassDataSource",
    "quicksight:DescribeDataSource",
  ],
  resources: ["*"],
});

backend.createQSDataSource.resources.lambda.addToRolePolicy(qsRegionalWriteDataSourcePolicy)
backend.createQSDataSource.addEnvironment('RESOURCE_PREFIX', RESOURCE_PREFIX)

// ---- QuickSight Read Policy for Lambdas ----
const qsReadPolicy = new iam.PolicyStatement({
  sid: "ReadQuicksight",
  actions: [
    "quicksight:DescribeNamespace",
    "quicksight:DescribeUser",
    "quicksight:DescribeGroup",
    "quicksight:DescribeDataSet",
    "quicksight:ListDataSets",
    "quicksight:ListUsers",
    "quicksight:ListGroups",
    "quicksight:ListNamespaces",
  ],
  resources: ["*"],
});

backend.fetchNamespacesFromQS.resources.lambda.addToRolePolicy(qsReadPolicy)
backend.fetchGroupsFromQS.resources.lambda.addToRolePolicy(qsReadPolicy)
backend.fetchUsersFromQS.resources.lambda.addToRolePolicy(qsReadPolicy)
backend.fetchDataSetsFromQS.resources.lambda.addToRolePolicy(qsReadPolicy)
backend.fetchDataSetFieldsFromQS.resources.lambda.addToRolePolicy(qsReadPolicy)
backend.checkQSManagementRegionAccess.resources.lambda.addToRolePolicy(qsReadPolicy)

/**
 * ---- CloudWatch Policy
 * cloudwatch:GetMetricData
 */
const cloudwatchPolicyStatement = new iam.PolicyStatement({
  sid: "CloudWatch",
  actions: [
    "cloudwatch:GetMetricData"
  ],
  resources: ["*"],
});

backend.getQSSpiceCapacity.resources.lambda.addToRolePolicy(cloudwatchPolicyStatement)