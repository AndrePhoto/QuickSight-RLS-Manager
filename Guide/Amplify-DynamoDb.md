# DynamoDB Tables Schema and Structure

This document provides a comprehensive overview of the DynamoDB tables used by the QuickSight RLS Manager, including their schemas, relationships, and usage patterns.

## Overview

The RLS Manager uses **5 DynamoDB tables** to store configuration, permissions, and audit data. All tables are created and managed automatically by AWS Amplify with on-demand billing and encryption at rest.

### Table Summary

| Table | Purpose | Primary Key | Records |
|-------|---------|-------------|---------|
| [AccountDetails](#accountdetails) | Account configuration | `accountId` | 1 record |
| [ManagedRegion](#managedregion) | Regional resources | `regionName` | 1 per region |
| [Namespace](#namespace) | QuickSight namespaces | `namespaceArn` | 1 per namespace |
| [DataSet](#dataset) | DataSet metadata | `dataSetArn` | 1 per DataSet |
| [UserGroup](#usergroup) | Users and groups | `userGroupArn` | 1 per user/group |
| [Permission](#permission) | RLS permissions | Auto-generated | Many per DataSet |
| [RLSDataSetVisibility](#rlsdatasetvisibility) | RLS DataSet access | Auto-generated | Many per RLS DataSet |
| [PublishHistory](#publishhistory) | Version history | Auto-generated | Many per DataSet |

---

## Table Schemas

### AccountDetails

**Purpose**: Stores global account configuration and statistics.

**Identifier**: `accountId` (AWS Account ID)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `accountId` | String (ID) | ✅ | AWS Account ID (12 digits) |
| `qsManagementRegion` | String | ✅ | QuickSight management region (e.g., "us-east-1") |
| `namespacesCount` | Integer | ✅ | Total number of QuickSight namespaces |
| `groupsCount` | Integer | ✅ | Total number of QuickSight groups |
| `usersCount` | Integer | ✅ | Total number of QuickSight users |
| `createdAt` | DateTime | Auto | Record creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Example Record**:
```json
{
  "accountId": "123456789012",
  "qsManagementRegion": "us-east-1",
  "namespacesCount": 1,
  "groupsCount": 5,
  "usersCount": 25,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T14:20:00Z"
}
```

---

### ManagedRegion

**Purpose**: Tracks AWS regions where RLS resources are deployed.

**Identifier**: `regionName` (AWS Region)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `regionName` | String (ID) | ✅ | AWS region name (e.g., "us-west-2") |
| `availableCapacityInGB` | Float | ✅ | Available SPICE capacity in GB |
| `usedCapacityInGB` | Float | ✅ | Used SPICE capacity in GB |
| `s3BucketName` | String | ✅ | S3 bucket name for CSV files |
| `glueDatabaseName` | String | ✅ | Glue database name |
| `qsDataSource` | String | ✅ | QuickSight DataSource name |
| `datasetsCount` | Integer | ✅ | Total DataSets in region |
| `notManageableDatasetsCount` | Integer | ✅ | Non-API manageable DataSets |
| `toolCreatedCount` | Integer | ✅ | Tool-created DataSets |
| `createdAt` | DateTime | Auto | Record creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Example Record**:
```json
{
  "regionName": "us-west-2",
  "availableCapacityInGB": 10.0,
  "usedCapacityInGB": 2.5,
  "s3BucketName": "qs-managed-rls-abc123def456",
  "glueDatabaseName": "qs-managed-rls-abc123def456",
  "qsDataSource": "qs-managed-rls-abc123def456",
  "datasetsCount": 15,
  "notManageableDatasetsCount": 3,
  "toolCreatedCount": 2
}
```

---

### Namespace

**Purpose**: Stores QuickSight namespace information.

**Identifier**: `namespaceArn` (QuickSight Namespace ARN)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `namespaceArn` | String (ID) | ✅ | QuickSight namespace ARN |
| `namespaceName` | String | ✅ | Namespace name (usually "default") |
| `capacityRegion` | String | ✅ | Region where SPICE capacity is allocated |
| `createdAt` | DateTime | Auto | Record creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Relationships**:
- `userGroups`: Has many → [UserGroup](#usergroup)

**Example Record**:
```json
{
  "namespaceArn": "arn:aws:quicksight:us-east-1:123456789012:namespace/default",
  "namespaceName": "default",
  "capacityRegion": "us-east-1"
}
```

---

### DataSet

**Purpose**: Stores metadata for all QuickSight DataSets (both main and RLS DataSets).

**Identifier**: `dataSetArn` (QuickSight DataSet ARN)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dataSetArn` | String (ID) | ✅ | QuickSight DataSet ARN |
| `dataSetId` | String | ✅ | DataSet ID (UUID) |
| `name` | String | ✅ | DataSet display name |
| `rlsEnabled` | Enum | ✅ | "ENABLED" or "DISABLED" |
| `rlsToolManaged` | Boolean | ✅ | True if RLS managed by this tool |
| `rlsDataSetId` | String | ❌ | Related RLS DataSet ID (if applicable) |
| `isRls` | Boolean | ✅ | True if this is an RLS DataSet |
| `newDataPrep` | Boolean | ✅ | True if uses new data prep experience |
| `apiManageable` | Boolean | ✅ | True if manageable via API |
| `toolCreated` | Boolean | ✅ | True if created by this tool |
| `dataSetRegion` | String | ✅ | AWS region where DataSet exists |
| `glueS3Id` | String | ❌ | Glue table/S3 key ID (for RLS DataSets) |
| `spiceCapacityInBytes` | Integer | ❌ | SPICE capacity used in bytes |
| `createdTime` | String | ❌ | QuickSight creation time |
| `importMode` | String | ❌ | Import mode (SPICE, DirectQuery) |
| `lastUpdatedTime` | String | ❌ | QuickSight last update time |
| `fieldTypes` | String | ❌ | JSON map of field names to types |
| `currentVersion` | Integer | ❌ | Current version number |
| `lastPublishedVersion` | Integer | ❌ | Last successfully published version |
| `lastPublishedAt` | DateTime | ❌ | When last published to QuickSight |
| `createdAt` | DateTime | Auto | Record creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Relationships**:
- `permissions`: Has many → [Permission](#permission)
- `rlsVisibility`: Has many → [RLSDataSetVisibility](#rlsdatasetvisibility)
- `publishHistory`: Has many → [PublishHistory](#publishhistory)

**Example Record** (Main DataSet):
```json
{
  "dataSetArn": "arn:aws:quicksight:us-west-2:123456789012:dataset/sales-data-2024",
  "dataSetId": "sales-data-2024",
  "name": "Sales Data 2024",
  "rlsEnabled": "ENABLED",
  "rlsToolManaged": true,
  "rlsDataSetId": "rls-sales-data-2024",
  "isRls": false,
  "newDataPrep": true,
  "apiManageable": true,
  "toolCreated": false,
  "dataSetRegion": "us-west-2",
  "spiceCapacityInBytes": 1048576000,
  "fieldTypes": "{\"Region\":\"STRING\",\"SalesAmount\":\"DECIMAL\",\"Date\":\"DATETIME\"}",
  "currentVersion": 3,
  "lastPublishedVersion": 3,
  "lastPublishedAt": "2024-01-15T14:30:00Z"
}
```

**Example Record** (RLS DataSet):
```json
{
  "dataSetArn": "arn:aws:quicksight:us-west-2:123456789012:dataset/rls-sales-data-2024",
  "dataSetId": "rls-sales-data-2024",
  "name": "RLS for Sales Data 2024",
  "rlsEnabled": "DISABLED",
  "rlsToolManaged": false,
  "isRls": true,
  "newDataPrep": false,
  "apiManageable": false,
  "toolCreated": true,
  "dataSetRegion": "us-west-2",
  "glueS3Id": "sales-data-2024"
}
```

---

### UserGroup

**Purpose**: Stores QuickSight users and groups information.

**Identifier**: `userGroupArn` (QuickSight User/Group ARN)

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userGroupArn` | String (ID) | ✅ | QuickSight user or group ARN |
| `userGroup` | Enum | ✅ | "User" or "Group" |
| `name` | String | ✅ | User/group name |
| `namespaceName` | String | ✅ | Namespace name |
| `email` | String | ✅ | Email address |
| `role` | String | ✅ | QuickSight role (ADMIN, AUTHOR, READER) |
| `identityType` | String | ❌ | Identity type (for users) |
| `active` | Boolean | ❌ | Active status (for users) |
| `principalId` | String | ❌ | Principal ID |
| `description` | String | ❌ | Description (for groups) |
| `createdAt` | DateTime | Auto | Record creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Relationships**:
- `namespace`: Belongs to → [Namespace](#namespace)
- `permission`: Has many → [Permission](#permission)
- `rlsVisibility`: Has many → [RLSDataSetVisibility](#rlsdatasetvisibility)

**Example Record** (User):
```json
{
  "userGroupArn": "arn:aws:quicksight:us-east-1:123456789012:user/default/john.doe",
  "userGroup": "User",
  "name": "john.doe",
  "namespaceName": "default",
  "email": "john.doe@example.com",
  "role": "AUTHOR",
  "identityType": "IAM",
  "active": true,
  "principalId": "AIDACKCEVSQ6C2EXAMPLE"
}
```

**Example Record** (Group):
```json
{
  "userGroupArn": "arn:aws:quicksight:us-east-1:123456789012:group/default/sales-team",
  "userGroup": "Group",
  "name": "sales-team",
  "namespaceName": "default",
  "email": "sales-team@example.com",
  "role": "READER",
  "description": "Sales team members",
  "principalId": "sales-team"
}
```

---

### Permission

**Purpose**: Stores individual RLS permission rules.

**Identifier**: Auto-generated by DynamoDB

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dataSetArn` | String | ✅ | DataSet ARN this permission applies to |
| `userGroupArn` | String | ✅ | User/group ARN this permission is for |
| `field` | String | ✅ | Field name ("*" for all fields) |
| `rlsValues` | String | ✅ | Comma-separated allowed values |
| `status` | Enum | ✅ | PENDING, PUBLISHED, FAILED, MANUAL |
| `lastPublishedAt` | DateTime | ❌ | When successfully published |
| `createdAt` | DateTime | Auto | Record creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Relationships**:
- `dataSet`: Belongs to → [DataSet](#dataset)
- `userGroup`: Belongs to → [UserGroup](#usergroup)

**Status Values**:
- **PENDING**: Permission created but not yet published to QuickSight
- **PUBLISHED**: Successfully applied to QuickSight
- **FAILED**: Publishing failed (with error details)
- **MANUAL**: For non-API manageable DataSets (CSV download required)

**Example Records**:
```json
{
  "dataSetArn": "arn:aws:quicksight:us-west-2:123456789012:dataset/sales-data-2024",
  "userGroupArn": "arn:aws:quicksight:us-east-1:123456789012:user/default/john.doe",
  "field": "Region",
  "rlsValues": "US-West,US-East",
  "status": "PUBLISHED",
  "lastPublishedAt": "2024-01-15T14:30:00Z"
}
```

```json
{
  "dataSetArn": "arn:aws:quicksight:us-west-2:123456789012:dataset/sales-data-2024",
  "userGroupArn": "arn:aws:quicksight:us-east-1:123456789012:group/default/managers",
  "field": "*",
  "rlsValues": "*",
  "status": "PUBLISHED",
  "lastPublishedAt": "2024-01-15T14:30:00Z"
}
```

---

### RLSDataSetVisibility

**Purpose**: Controls who can view and manage RLS DataSets in QuickSight.

**Identifier**: Auto-generated by DynamoDB

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `rlsDataSetArn` | String | ✅ | RLS DataSet ARN |
| `dataSetArn` | String | ✅ | Main DataSet ARN (for reference) |
| `userGroupArn` | String | ✅ | User/group ARN |
| `permissionLevel` | Enum | ✅ | "OWNER" or "VIEWER" |
| `createdAt` | DateTime | Auto | Record creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Relationships**:
- `dataSet`: Belongs to → [DataSet](#dataset)
- `userGroup`: Belongs to → [UserGroup](#usergroup)

**Permission Levels**:
- **OWNER**: Full access to RLS DataSet (edit, delete, share)
- **VIEWER**: Read-only access to RLS DataSet

**Example Record**:
```json
{
  "rlsDataSetArn": "arn:aws:quicksight:us-west-2:123456789012:dataset/rls-sales-data-2024",
  "dataSetArn": "arn:aws:quicksight:us-west-2:123456789012:dataset/sales-data-2024",
  "userGroupArn": "arn:aws:quicksight:us-east-1:123456789012:user/default/admin",
  "permissionLevel": "OWNER"
}
```

---

### PublishHistory

**Purpose**: Maintains version history and audit trail for published permissions.

**Identifier**: Auto-generated by DynamoDB

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `dataSetArn` | String | ✅ | DataSet ARN |
| `version` | Integer | ✅ | Version number (incremental) |
| `publishedAt` | DateTime | ✅ | When published |
| `publishedBy` | String | ❌ | User who published (future feature) |
| `s3VersionId` | String | ❌ | S3 version ID of CSV file |
| `s3Key` | String | ❌ | S3 key of CSV file |
| `permissionCount` | Integer | ✅ | Number of permissions in version |
| `status` | Enum | ✅ | "SUCCESS" or "FAILED" |
| `errorMessage` | String | ❌ | Error message if failed |
| `csvSnapshot` | String | ❌ | CSV content snapshot |
| `createdAt` | DateTime | Auto | Record creation timestamp |
| `updatedAt` | DateTime | Auto | Last update timestamp |

**Relationships**:
- `dataSet`: Belongs to → [DataSet](#dataset)

**Example Record**:
```json
{
  "dataSetArn": "arn:aws:quicksight:us-west-2:123456789012:dataset/sales-data-2024",
  "version": 3,
  "publishedAt": "2024-01-15T14:30:00Z",
  "s3VersionId": "abc123def456ghi789",
  "s3Key": "sales-data-2024/permissions.csv",
  "permissionCount": 25,
  "status": "SUCCESS"
}
```

---

## Data Relationships

### Entity Relationship Diagram

```
AccountDetails (1)
    │
    └── ManagedRegion (1:N)
            │
            └── DataSet (1:N)
                    │
                    ├── Permission (1:N)
                    ├── RLSDataSetVisibility (1:N)
                    └── PublishHistory (1:N)

Namespace (1)
    │
    └── UserGroup (1:N)
            │
            ├── Permission (1:N)
            └── RLSDataSetVisibility (1:N)
```

### Key Relationships

1. **AccountDetails → ManagedRegion**: One account can have multiple managed regions
2. **ManagedRegion → DataSet**: Each region contains multiple DataSets
3. **DataSet → Permission**: Each DataSet can have multiple permissions
4. **UserGroup → Permission**: Each user/group can have permissions on multiple DataSets
5. **DataSet → PublishHistory**: Each DataSet maintains version history
6. **DataSet → RLSDataSetVisibility**: RLS DataSets have visibility controls

---

## Access Patterns

### Common Query Patterns

1. **Get Account Configuration**:
   ```
   Query: AccountDetails by accountId
   ```

2. **List Managed Regions**:
   ```
   Query: ManagedRegion.list()
   ```

3. **Get DataSets in Region**:
   ```
   Query: DataSet.list() where dataSetRegion = "us-west-2"
   ```

4. **Get Permissions for DataSet**:
   ```
   Query: Permission.list() where dataSetArn = "arn:..."
   ```

5. **Get User's Permissions**:
   ```
   Query: Permission.list() where userGroupArn = "arn:..."
   ```

6. **Get Version History**:
   ```
   Query: PublishHistory.list() where dataSetArn = "arn:..." order by version DESC
   ```

### Performance Considerations

- **On-Demand Billing**: Tables use on-demand billing for cost optimization
- **Global Secondary Indexes**: May be added for complex query patterns
- **Batch Operations**: Used for bulk permission updates
- **Pagination**: Implemented for large result sets

---

## Data Consistency

### ACID Properties

- **Atomicity**: Each permission operation is atomic
- **Consistency**: Foreign key relationships maintained via application logic
- **Isolation**: DynamoDB provides read/write isolation
- **Durability**: Data replicated across multiple AZs

### Eventual Consistency

- **Read Consistency**: Eventually consistent reads used for performance
- **Write Consistency**: Strongly consistent for critical operations
- **Cross-Table Consistency**: Managed via application transactions

---

## Security

### Encryption

- **At Rest**: All tables encrypted with AWS managed keys
- **In Transit**: All API calls use TLS 1.2+
- **Field Level**: Sensitive fields can be encrypted at application level

### Access Control

- **IAM Roles**: Lambda functions use least-privilege IAM roles
- **Cognito Integration**: User authentication via Cognito User Pools
- **Resource-Based**: Access controlled via Amplify authorization rules

### Audit Trail

- **CloudTrail**: All DynamoDB API calls logged
- **Application Logs**: Permission changes logged in CloudWatch
- **Version History**: Complete audit trail in PublishHistory table

---

## Backup and Recovery

### Point-in-Time Recovery

- **Enabled**: All tables have point-in-time recovery enabled
- **Retention**: 35-day retention period
- **Granularity**: Second-level recovery granularity

### Backup Strategy

- **Automatic Backups**: Daily automatic backups
- **On-Demand Backups**: Manual backups before major changes
- **Cross-Region**: Backups can be copied to other regions

### Disaster Recovery

- **RTO**: Recovery Time Objective < 4 hours
- **RPO**: Recovery Point Objective < 1 hour
- **Multi-AZ**: Data replicated across multiple Availability Zones

---

## Monitoring and Alerting

### CloudWatch Metrics

- **Read/Write Capacity**: Monitor consumed capacity
- **Throttling**: Alert on throttled requests
- **Error Rates**: Monitor 4xx/5xx error rates
- **Latency**: Track P99 latency metrics

### Custom Metrics

- **Permission Count**: Track total permissions per DataSet
- **Publish Success Rate**: Monitor publishing success/failure rates
- **Version Growth**: Track version history growth

### Alerting

- **High Error Rates**: Alert when error rate > 5%
- **Capacity Issues**: Alert when consumed capacity > 80%
- **Failed Publishes**: Immediate alert on publish failures

---

## Cost Optimization

### On-Demand Pricing

- **No Provisioning**: Pay only for actual read/write requests
- **Auto Scaling**: Automatic scaling based on demand
- **Cost Predictable**: Costs scale with usage

### Storage Optimization

- **TTL**: Time-to-live for temporary data (if applicable)
- **Compression**: Large text fields compressed at application level
- **Archival**: Old publish history archived to S3

### Query Optimization

- **Efficient Queries**: Use primary keys and indexes
- **Batch Operations**: Reduce API calls with batch operations
- **Caching**: Application-level caching for frequently accessed data

---

## Migration and Versioning

### Schema Evolution

- **Backward Compatible**: New fields added as optional
- **Migration Scripts**: Automated migration for schema changes
- **Version Tracking**: Schema version tracked in AccountDetails

### Data Migration

- **Export/Import**: Built-in export/import functionality
- **Bulk Operations**: Efficient bulk data operations
- **Validation**: Data validation during migration

---

This completes the comprehensive DynamoDB documentation for the QuickSight RLS Manager. The tables are designed for scalability, performance, and maintainability while supporting all the features of the RLS management system.