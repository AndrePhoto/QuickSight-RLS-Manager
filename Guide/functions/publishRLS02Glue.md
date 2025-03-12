# Publish Permissions to RLS - Step 0: Resources Validation
This Lambda function will verify if a _Glue Table_ referring to the _DataSet to be Secured_ exists in the _Glue Database_ in the selected _Region_.
If the table does not exists, it will create it. Otherwise it will update the Table with a new version.

**Lambda Details**
* [*Source Code*](/amplify/functions/publishRLS02Glue/handler.ts)
* [*Lambda Resource definition*](/amplify/data/resource.ts)
* Lambda Timeout: 120 s

## Input
| Name | Description | Type | Required | Variable |
| -------- | ---- | ----------- | ---- | ---- |
| accountId | AWS Account ID where the Tool is running | string | yes | env |
| region | | string | yes | arg |
| s3BucketName | | string | yes | arg |
| glueDatabaseName | | string | yes | arg |
| dataSetId | | string | yes | arg |
| csvColumns | | array of string | yes | arg |

## Output 
| Name | Description | Type | Required |
| -------- | ---- | ----------- | ---- |
| statusCode | Http Status Code | int | yes |
| message | Custom Message | string | yes |
| errorType | Short name of the Eror | string | no |

## Flow
![Architecture](/Guide/images/publishRLS02Glue.jpg)

### Check if Glue Table already exists
To check if the Glue Table already exists, we use the AWS SDK [Glue GetTableCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/glue/command/GetTableCommand/).

Depending on the result of the check, we proceed to create or update the Glue Table.

The following _TableInput_ params are used to create (or update) the Table:
```ts
  TableInput: {
    Name: glueTableName,
    Description: glueTableDescription,
    StorageDescriptor: {
      Columns: csvColumns
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
```

### Create new Glue Table
To create the new Table, we use the AWS SDK [Glue CreateTableCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/glue/command/CreateTableCommand/).

### Updating existing Glue Table
To update the existing Table, we use the AWS SDK [Glue UpdateTableCommand](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/glue/command/UpdateTableCommand/).

#### Permissions
```json
{
  "Effect": "Allow",
  "Action": [
    "glue:GetDatabase",
    "glue:GetTable",
    "glue:CreateTable",
    "glue:UpdateTable"
  ],
  "Resource": [
    "arn:aws:glue:*:[ACCOUNT_ID]:catalog",
    "arn:aws:glue:*:[ACCOUNT_ID]:database/qs-managed-rls-*",
    "arn:aws:glue:*:[ACCOUNT_ID]:table/qs-managed-rls-*/*"
  ]
}
```