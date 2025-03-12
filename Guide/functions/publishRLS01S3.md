# Publish Permissions to RLS - Step 1: Publish new version of CSV to S3
This Lambda function will create a new version of a _CSV_ file in the RLS S3 Bucket in the selected _Region_ (the same where the DataSet to be Secured is).
Since we want to keep older versions of CSV permissions, it doesn't matters if a previous version of the file exists. We still need to create a new file with _s3api_.

**Lambda Details**
* [*Source Code*](/amplify/functions/publishRLS01S3/handler.ts)
* [*Lambda Resource definition*](/amplify/data/resource.ts)
* Lambda Timeout: 120 s

## Input
| Name | Description | Type | Required | Variable |
| -------- | ---- | ----------- | ---- | ---- |
| accountId | AWS Account ID where the Tool is running | string | yes | env |
| region | | string | yes | arg |
| s3BucketName | | string | yes | arg |
| dataSetId | | string | yes | arg |
| csvContent | | string | yes | arg |
| csvHeaders | | array of string | yes | arg |

## Output 
| Name | Description | Type | Required |
| -------- | ---- | ----------- | ---- |
| statusCode | Http Status Code | int | yes |
| message | Custom Message | string | yes |
| csvColumns | The Columns header of the CSV | array of strings | yes | 
| errorType | Short name of the Eror | string | no |

## Flow
![Architecture](/Guide/images/publishRLS01S3.jpg)

### Check CVS Header
This part of the Lambda will check that the CSV has valid columns, removing duplicates, null or undefined columns.

### Save CSV in S3
The S3 Bucket is checked with Step 0, so we just need to put the new file in the correct path.
* There's no need to check that the file is already existing: if exists, a new version will be created.
* The bucket is the one of the Region where the DataSet to be Secured is.
* The path is composed with the ID of the DataSet to be Secured (`dataSetId`)

```ts
  const csvFileName = `QS_RLS_Managed_${dataSetId}.csv`
  const s3Key = `RLS-Datasets/${dataSetId}/${csvFileName}`
```

To put the new file, we use AWS SDK [S3 PutObjectCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/s3/command/PutObjectCommand/).

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