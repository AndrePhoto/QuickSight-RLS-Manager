# Publish Permissions to RLS - Step 0: Resources Validation
This Lambda function will verify that the following resources have been created (and not removed by other users) in a specific _Region_:
* S3 Bucket to store RLS CSV files
* Glue Database that reads from S3 Bucket
* QuickSight DataSource used to create the RLS DataSets.

**Lambda Details**
* [*Source Code*](/amplify/functions/publishRLS00ResourcesValidation/handler.ts)
* [*Lambda Resource definition*](/amplify/data/resource.ts)
* Lambda Timeout: 120 s

## Input
| Name | Description | Type | Required | Variable |
| -------- | ---- | ----------- | ---- | ---- |
| accountId | AWS Account ID where the Tool is running | string | yes | env |
| region | | string | yes | arg |
| s3BucketName | | string | yes | arg |
| glueDatabaseName | | string | yes | arg |
| qsDataSourceName | | string | yes | arg |

## Output 
| Name | Description | Type | Required |
| -------- | ---- | ----------- | ---- |
| statusCode | Http Status Code | int | yes |
| message | Custom Message | string | yes |
| errorType | Short name of the Eror | string | no |

## Flow
![Architecture](/Guide/images/Lambda_publishRLS00ResourcesValidation.png)

### S3 Bucket Check
An S3 Bucket has been created for each Region managed in the RLS Tool. 
To check that this resource has been correctly created and it's still there (so no one else has modified or deleted the resources or the permissions), we use AWS SDK [S3 HeadBucketCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/HeadBucketCommand/).

#### Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "s3:ListBucket"
  ],
  "Resource": [
    "arn:aws:s3:::qs-managed-rls-*",
    "arn:aws:s3:::qs-managed-rls-*/*"
  ]
}
```

### Glue Database Check
A Glue Database has been created for each Region managed in the RLS Tool. 
To check that this resource has been correctly created and it's still there (so no one else has modified or deleted the resources or the permissions), we use AWS SDK [Glue GetDatabaseCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/glue/command/GetDatabaseCommand/).

#### Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "glue:GetDatabase"
  ],
  "Resource": [
    "arn:aws:glue:*:[ACCOUNT_ID]:catalog",
    "arn:aws:glue:*:[ACCOUNT_ID]:database/qs-managed-rls-*",
    "arn:aws:glue:*:[ACCOUNT_ID]:table/qs-managed-rls-*/*"
  ]
}
```

### QuickSight DataSource Check
A QuickSight DataSource has been created for each Region managed in the RLS Tool. 
To check that this resource has been correctly created and it's still there (so no one else has modified or deleted the resources or the permissions), we use AWS SDK [QuickSight DescribeDataSourceCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/quicksight/command/DescribeDataSourceCommand/).

#### Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "quicksight:DescribeDataSource"
  ],
  "Resource": "*",
}
```