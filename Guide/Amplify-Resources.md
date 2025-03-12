# QuickSight RLS Management Schema

This schema defines the data models and API operations for managing Row-Level Security (RLS) in Amazon QuickSight using AWS Amplify.


![Architecture](/Guide/images/RLS-Tool-Architecture.jpg)

## Data Models

These models are the DynamoDB created by Amplify

### AccountDetails
Stores information about the deployed architecture configuration:
- `accountId`: Unique identifier for the AWS account
- `qsManagementRegion`: QuickSight management region
- `namespacesCount`: Number of namespaces
- `groupsCount`: Number of groups
- `usersCount`: Number of users

### ManagedRegion
Tracks QuickSight SPICE capacity and resources per region:
- `regionName`: AWS region identifier
- `capacityInGB`: Total SPICE capacity
- `usedCapacityInGB`: Used SPICE capacity
- `s3BucketName`: Associated S3 bucket
- `glueDatabaseName`: Associated Glue database
- `qsDataSource`: QuickSight data source
- `datasetsCount`: Number of datasets
- `notManageableDatasetsCount`: Number of datasets that cannot be managed

### Namespace
Represents QuickSight namespaces:
- `namespaceArn`: Unique ARN identifier
- `namespaceName`: Name of the namespace
- `capacityRegion`: Associated region
- `userGroups`: Related user groups

### DataSet
Defines QuickSight datasets and their RLS configuration:
- `dataSetArn`: Unique ARN identifier
- `dataSetId`: Dataset identifier
- `name`: Dataset name
- `rlsEnabled`: RLS status (ENABLED/DISABLED)
- `rlsToolManaged`: Whether RLS is managed by this tool
- `apiManageable`: API management capability
- `fields`: Dataset fields
- `permissions`: Associated permissions

### UserGroup
Manages users and groups:
- `userGroup`: Type (User/Group)
- `name`: Name of user or group
- `userGroupArn`: ARN identifier
- `namespaceName`: Associated namespace
- `email`: Email address
- `role`: User role
- `active`: Active status
- `permissions`: Associated permissions

### Permission
Defines RLS permissions:
- `dataSetArn`: Dataset ARN
- `userGroupArn`: User/Group ARN
- `field`: Field name for RLS
- `rlsValues`: Comma-separated RLS values

## API Operations

### Queries
1. [`setAccount`](/Guide/functions/setAccount.md): Configure account settings
2. `fetchNamespacesFromQS`: Retrieve QuickSight namespaces
3. `fetchGroupsFromQS`: Get groups from a namespace
4. `fetchUsersFromQS`: Get users from a namespace
5. `fetchDataSetsFromQS`: Retrieve datasets from a region
6. `fetchDataSetFieldsFromQS`: Get fields from a dataset
7. `getQSSpiceCapacity`: Check SPICE capacity
8. `publishRLStoQuickSight`: Publish RLS configurations // RIMOSSO E SPALMATO SU PIU' STEP
9. `createS3Bucket`: Create S3 bucket for RLS data
10. `checkQSManagementRegionAccess`: Verify region access

## Authentication

- All operations require authentication through AWS Cognito User Pools
- API Key authorization is available with 30-day expiration
- Default authorization mode is set to "userPool"

## Usage Notes

1. All models and operations are protected by authentication
2. Operations return standardized response types with status codes and messages
3. Error handling is implemented across all operations
4. The schema supports relationships between models (hasMany, belongsTo)
5. RLS configurations can be managed and published programmatically

This schema is designed to provide a comprehensive solution for managing QuickSight RLS configurations through a structured API interface while maintaining security through authentication and authorization controls.