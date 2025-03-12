import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/** 
 * Import Lambda Functions
 */
import { setAccount } from "../functions/setAccount/resources";
import { fetchUsersFromQS } from "../functions/fetchUsersFromQS/resources";
import { fetchNamespacesFromQS } from "../functions/fetchNamespacesFromQS/resources";
import { fetchGroupsFromQS } from "../functions/fetchGroupsFromQS/resources";
import { fetchDataSetsFromQS } from "../functions/fetchDataSetsFromQS/resources";
import { fetchDataSetFieldsFromQS } from "../functions/fetchDataSetFieldsFromQS/resources";
import { getQSSpiceCapacity } from "../functions/getQSSpiceCapacity/resources";
// import { publishRLStoQuickSight } from "../functions/publishRLStoQuickSight/resources";
import { createS3Bucket } from "../functions/createS3Bucket/resources";
import { createGlueDatabase } from "../functions/createGlueDatabase/resources";
import { createQSDataSource } from "../functions/createQSDataSource/resources";
import { checkQSManagementRegionAccess } from "../functions/checkQSManagementRegionAccess/resources"
import { publishRLS00ResourcesValidation } from "../functions/publishRLS00ResourcesValidation/resources"
import { publishRLS01S3 } from "../functions/publishRLS01S3/resources";
import { publishRLS02Glue } from "../functions/publishRLS02Glue/resources";
import { publishRLS03QsRLSDataSet } from "../functions/publishRLS03QsRLSDataSet/resources";
import { publishRLS99QsCheckIngestion } from "../functions/publishRLS99QsCheckIngestion/resources"
import { publishRLS04QsUpdateMainDataSetRLS } from "../functions/publishRLS04QsUpdateMainDataSetRLS/resources"

import { removeRLSDataSet } from "../functions/removeRLSDataSet/resources"
import { deleteDataSetFromQS } from "../functions/deleteDataSetFromQS/resources"
import { deleteDataSetGlueTable } from "../functions/deleteDataSetGlueTable/resources"
import { deleteDataSetS3Objects } from "../functions/deleteDataSetS3Objects/resources"

const UserGroupType = {
  User: 'User',
  Group: 'Group'
} as const;

const rlsStatus = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED'
} as const;

const FunctionResponseType = a.customType({
  statusCode: a.integer().required(),
  message: a.string().required(),
  errorMessage: a.string(),
  errorName: a.string()
});

const schema = a.schema({
  /**
   * Utility Model which keep info on the architecture deployed to be shown on the Front End 
   */
  AccountDetails: a
    .model({
      accountId: a.id().required(),
      qsManagementRegion: a.string().required(),
      namespacesCount: a.integer().required(),
      groupsCount: a.integer().required(),
      usersCount: a.integer().required(),
      createdAt: a.datetime(),
      updatedAt: a.datetime()
    })
    .identifier(['accountId'])
    .authorization((allow) => [
      allow.authenticated(),
    ]),
  /**
   * Create a model to store the Managed Regions. This must have a id (which is the aws region name, e.g. eu-central-1), the total spice capacity avaiable and used
   */
  ManagedRegion: a
    .model({
      regionName: a.id().required(),
      availableCapacityInGB: a.float().required(),
      usedCapacityInGB: a.float().required(),
      s3BucketName: a.string().required(),
      glueDatabaseName: a.string().required(),
      qsDataSource: a.string().required(),
      datasetsCount: a.integer().required(),
      notManageableDatasetsCount: a.integer().required(),
      toolCreatedCount: a.integer().required(),
      createdAt: a.datetime(),
      updatedAt: a.datetime()
    })
    .identifier(['regionName'])
    .authorization((allow) => [
      allow.authenticated(),
    ]),
  /**
   * Main Models to manage Permissions
   */
  Namespace: a
    .model({
      namespaceArn: a.id().required(), // Unique identifier for the namespace
      namespaceName: a.string().required(),
      capacityRegion: a.string().required(),
      userGroups: a.hasMany('UserGroup', 'namespaceName'), // UserGroups associated with the namespace
      createdAt: a.datetime(),
      updatedAt: a.datetime()
    })
    .identifier(['namespaceArn'])
    .authorization((allow) => [
      allow.authenticated(),
    ]),
  DataSet: a
    .model({
      dataSetArn: a.id().required(), // Unique identifier for the dataset
      dataSetId: a.string().required(),
      name: a.string().required(), // Name of the dataset
      rlsEnabled: a.enum(Object.values(rlsStatus)), 
      rlsToolManaged: a.boolean().required(), 
      rlsDataSetId: a.string(), // Related RLS dataset ID
      apiManageable: a.boolean().required(), // Indicates if the dataset is managed by API
      toolCreated: a.boolean().required(), // Indicates if the dataset is managed by this Tool
      dataSetRegion: a.string().required(),
      glueS3Id: a.string(), // if this is a RLS DataSet, then this indicates the ID of the GlueTable and the S3 Key
      spiceCapacityInBytes: a.integer(),
      createdTime: a.string(),
      importMode: a.string(),
      lastUpdatedTime: a.string(), 
      fields: a.string().array(),
      permissions: a.hasMany('Permission', 'dataSetArn'),
      createdAt: a.datetime(),
      updatedAt: a.datetime()
    })
    .identifier(['dataSetArn'])
    .authorization((allow) => [allow.authenticated()]),

  UserGroup: a
    .model({
      userGroup: a.enum(Object.values(UserGroupType)), // Indicates User or Group
      name: a.string().required(), // Name of the user or group
      userGroupArn: a.id().required(), // Amazon Resource Name
      namespaceName: a.string().required(), // Namespace name
      namespace: a.belongsTo('Namespace', 'namespaceName'), // Namespace (optional)
      email: a.string().required(), // Email address 
      role: a.string().required(), // Role (optional, for Users)
      identityType: a.string(), // Identity type (optional, for Users)
      active: a.boolean(), // Active status (optional, for Users)
      principalId: a.string(), // Principal ID
      description: a.string(),
      permission: a.hasMany('Permission', 'userGroupArn'),
      createdAt: a.datetime(),
      updatedAt: a.datetime()
    })
    .identifier(['userGroupArn'])
    .authorization((allow) => [allow.authenticated()]),
  Permission: a
    .model({
      dataSetArn: a.string().required(),
      userGroupArn: a.string().required(),
      dataSet: a.belongsTo('DataSet', 'dataSetArn'), // Model name and foreign key field
      userGroup: a.belongsTo('UserGroup', 'userGroupArn'), // Model name and foreign key field
      field: a.string().required(), // Field name
      rlsValues: a.string().required(), // Comma-separated list of RLS values
      createdAt: a.datetime(),
      updatedAt: a.datetime()
    })
    .authorization((allow) => [allow.authenticated()]),

  /**
   * Lambda Functions Definition
   */
  setAccount: a
    .query()
    .arguments({
      qsManagementRegion: a.string().required(),
      namespacesCount: a.integer().required(),
      groupsCount: a.integer().required(),
      usersCount: a.integer().required(),
    })
    .returns(FunctionResponseType)
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(setAccount)),

  fetchNamespacesFromQS: a
    .query()
    .arguments({
      qsManagementRegion: a.string().required(),
      nextToken: a.string()
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      namespacesList: a.string().required(), // This will be a string containing a JSON of Namespaces(arn, name, capacityRegion)
      nextToken: a.string(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(fetchNamespacesFromQS)),

  fetchGroupsFromQS: a
    .query()
    .arguments({
      qsManagementRegion: a.string().required(),
      namespace: a.string().required(),
      nextToken: a.string()
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      groupsList: a.string().required(), // This will be a string containing a JSON of Groups (Arn, GroupName, PrincipalId, Description)
      nextToken: a.string(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(fetchGroupsFromQS)),

  fetchUsersFromQS: a
    .query()
    .arguments({
      qsManagementRegion: a.string().required(),
      namespace: a.string().required(),
      nextToken: a.string()
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      usersList: a.string().required(), // This will be a string containing a JSON of Users (Arn, GroupName, PrincipalId, Description...)
      nextToken: a.string(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(fetchUsersFromQS)),

  fetchDataSetsFromQS: a
    .query()
    .arguments({
      region: a.string().required(),
      nextToken: a.string()
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      datasetsList: a.string().required(), // This will be a string containing a JSON of dataSets
      nextToken: a.string(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(fetchDataSetsFromQS)),

  fetchDataSetFieldsFromQS: a
    .query()
    .arguments({
      region: a.string().required(),
      dataSetId: a.string().required(),
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      datasetsFields: a.string().required(), // This will be a string containing a JSON of dataSets
      spiceCapacityInBytes: a.integer().required(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(fetchDataSetFieldsFromQS)),

  getQSSpiceCapacity: a
    .query()
    .arguments({
      region: a.string().required(),
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      availableCapacityInGB: a.float().required(),
      usedCapacityInGB: a.float().required(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(getQSSpiceCapacity)),

    /**
     * Publish
     */
    /*
  publishRLStoQuickSight: a
    .query()
    .arguments({
      datasetRegion: a.string().required(),
      dataSetId: a.string().required(),
      csvContent: a.string().required(),
      csvHeaders: a.string().array().required(),
      s3Bucket: a.string().required(),
      glueDb: a.string().required(),
      qsDataSource: a.string().required(),
      rlsToolManaged: a.boolean().required(),
      rlsDataSetId: a.string(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      rlsDataSetArn: a.string(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(publishRLStoQuickSight)),*/

  publishRLS00ResourcesValidation: a
    .query()
    .arguments({
      region: a.string().required(),
      s3BucketName: a.string().required(),
      glueDatabaseName: a.string().required(),
      qsDataSourceName: a.string().required(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(publishRLS00ResourcesValidation)),

  publishRLS01S3: a
    .query()
    .arguments({
      region: a.string().required(),
      dataSetId: a.string().required(),
      csvContent: a.string().required(),
      csvHeaders: a.string().array().required(),
      s3BucketName: a.string().required(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      csvColumns: a.string().array().required(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(publishRLS01S3)),

  publishRLS02Glue: a
    .query()
    .arguments({
      region: a.string().required(),
      dataSetId: a.string().required(),
      s3BucketName: a.string().required(),
      glueDatabaseName: a.string().required(),
      csvColumns: a.string().array().required(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(publishRLS02Glue)),
    
  publishRLS03QsRLSDataSet: a
    .query()
    .arguments({
      region: a.string().required(),
      dataSetId: a.string().required(),
      glueDatabaseName: a.string().required(),
      qsDataSourceName: a.string().required(),
      csvColumns: a.string().array().required(),
      rlsToolManaged: a.boolean().required(),
      rlsDataSetArn: a.string(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      rlsDataSetArn: a.string(),
      ingestionId: a.string(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(publishRLS03QsRLSDataSet)),

    publishRLS04QsUpdateMainDataSetRLS: a
    .query()
    .arguments({
      region: a.string().required(),
      dataSetId: a.string().required(),
      rlsDataSetArn: a.string().required(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      ingestionId: a.string(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(publishRLS04QsUpdateMainDataSetRLS)),

    publishRLS99QsCheckIngestion: a
    .query()
    .arguments({
      datasetRegion: a.string().required(),
      dataSetId: a.string().required(),
      ingestionId: a.string().required(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(publishRLS99QsCheckIngestion)),
  /**
   * Regions Management and Set-Up
   */
  checkQSManagementRegionAccess: a
    .query()
    .arguments({
      qsManagementRegion: a.string().required(),
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      errorMessage: a.string(),
      errorName: a.string()
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(checkQSManagementRegionAccess)),

  createS3Bucket: a
    .query()
    .arguments({
      region: a.string().required(),
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      s3BucketName: a.string().required(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(createS3Bucket)),
  
  createGlueDatabase: a
    .query()
    .arguments({
      region: a.string().required(),
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      glueDatabaseName: a.string().required(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(createGlueDatabase)),

  createQSDataSource: a
    .query()
    .arguments({
      region: a.string().required(),
    })
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      qsDataSourceName: a.string().required(),
      errorName: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(createQSDataSource)),

    removeRLSDataSet: a
    .query()
    .arguments({
      region: a.string().required(),
      dataSetId: a.string().required(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      ingestionId: a.string(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(removeRLSDataSet)),

    deleteDataSetFromQS: a
    .query()
    .arguments({
      region: a.string().required(),
      dataSetId: a.string().required(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(deleteDataSetFromQS)),

    deleteDataSetGlueTable: a 
    .query()
    .arguments({
      region: a.string().required(),
      glueKey: a.string().required(),
      glueDatabaseName: a.string().required(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(deleteDataSetGlueTable)),

    deleteDataSetS3Objects: a
    .query()
    .arguments({
      region: a.string().required(),
      s3Key: a.string().required(),
      s3BucketName: a.string().required(),
    })    
    .returns(a.customType({
      statusCode: a.integer().required(),
      message: a.string().required(),
      errorType: a.string(),
    }))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(deleteDataSetS3Objects)),


}).authorization(allow => [
  allow.resource(setAccount),
  allow.resource(fetchNamespacesFromQS),
  allow.resource(fetchGroupsFromQS),
  allow.resource(fetchUsersFromQS),
  allow.resource(fetchDataSetsFromQS),
  allow.resource(fetchDataSetFieldsFromQS),
  allow.resource(getQSSpiceCapacity),
  // allow.resource(publishRLStoQuickSight),
  allow.resource(createS3Bucket),
  allow.resource(createGlueDatabase),
  allow.resource(createQSDataSource),
  allow.resource(checkQSManagementRegionAccess),
  allow.resource(publishRLS00ResourcesValidation),
  allow.resource(publishRLS01S3),
  allow.resource(publishRLS02Glue),
  allow.resource(publishRLS03QsRLSDataSet),
  allow.resource(publishRLS99QsCheckIngestion),
  allow.resource(publishRLS04QsUpdateMainDataSetRLS),
  allow.resource(removeRLSDataSet),
  allow.resource(deleteDataSetFromQS),
  allow.resource(deleteDataSetGlueTable),
  allow.resource(deleteDataSetS3Objects)
]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool",
    // API Key is used for a.allow.public() rules
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
  logging: {
    fieldLogLevel: "debug",
    excludeVerboseContent: false,
    retention: '1 week'
  }

});
