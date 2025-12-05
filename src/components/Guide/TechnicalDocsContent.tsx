import { SpaceBetween, Header, Box, Link, Container, Alert, ColumnLayout } from "@cloudscape-design/components";

export const TechnicalDocsContent = () => {
  return (
    <SpaceBetween size="l">
      <Box>
        <Header variant="h2">Technical Documentation</Header>
        <p>
          Detailed technical information about the RLS Manager architecture, AWS resources, and Lambda functions.
        </p>
      </Box>

      <Container header={<Header variant="h3">Architecture Overview</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>The RLS Manager is built using AWS Amplify and leverages multiple AWS services:</p>
          </Box>

          <ColumnLayout columns={2} variant="text-grid">
            <Box>
              <p><strong>Frontend & Hosting</strong></p>
              <ul>
                <li><strong>AWS Amplify</strong> - Hosts React web application with CI/CD</li>
                <li><strong>Amazon Cognito</strong> - User authentication and authorization</li>
                <li><strong>React 18</strong> - Frontend framework</li>
                <li><strong>TypeScript</strong> - Type-safe development</li>
                <li><strong>Cloudscape Design System</strong> - AWS UI components</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Backend Services</strong></p>
              <ul>
                <li><strong>AWS AppSync</strong> - GraphQL API for data management</li>
                <li><strong>AWS Lambda</strong> - 27 functions for automation</li>
                <li><strong>Amazon DynamoDB</strong> - 5 tables for data storage</li>
                <li><strong>AWS IAM</strong> - Service permissions and roles</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Data Storage (Per Region)</strong></p>
              <ul>
                <li><strong>Amazon S3</strong> - Stores RLS CSV files with versioning</li>
                <li><strong>AWS Glue</strong> - Data catalog for RLS table metadata</li>
                <li><strong>Amazon Athena</strong> - Queries Glue tables (via QuickSight)</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Business Intelligence</strong></p>
              <ul>
                <li><strong>Amazon QuickSight</strong> - Applies RLS and serves dashboards</li>
                <li><strong>SPICE</strong> - In-memory calculation engine</li>
              </ul>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">DynamoDB Tables</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>The RLS Manager uses 5 DynamoDB tables:</p>
          </Box>

          <ColumnLayout columns={2} variant="text-grid">
            <Box>
              <p><strong>1. AccountDetails</strong></p>
              <p>Stores global configuration:</p>
              <ul>
                <li>AWS Account ID</li>
                <li>QuickSight Management Region</li>
                <li>Last sync timestamp</li>
              </ul>
            </Box>

            <Box>
              <p><strong>2. ManagedRegion</strong></p>
              <p>Tracks managed regions:</p>
              <ul>
                <li>Region name</li>
                <li>S3 bucket name</li>
                <li>Glue database name</li>
                <li>DataSource ARN</li>
              </ul>
            </Box>

            <Box>
              <p><strong>3. DataSet</strong></p>
              <p>Stores DataSet metadata:</p>
              <ul>
                <li>DataSet ID and ARN</li>
                <li>Field names and types</li>
                <li>RLS status</li>
                <li>API manageability</li>
              </ul>
            </Box>

            <Box>
              <p><strong>4. Permission</strong></p>
              <p>Stores RLS permissions:</p>
              <ul>
                <li>User/Group name</li>
                <li>Field and value</li>
                <li>Status (PENDING/PUBLISHED)</li>
                <li>Version number</li>
              </ul>
            </Box>

            <Box>
              <p><strong>5. PublishHistory</strong></p>
              <p>Tracks publish operations:</p>
              <ul>
                <li>Version number</li>
                <li>Timestamp</li>
                <li>Permission count</li>
                <li>S3 version ID</li>
              </ul>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Lambda Functions</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>The RLS Manager uses 27 Lambda functions organized by purpose:</p>
          </Box>

          <Box>
            <p><strong>Publishing Workflow (6 Functions)</strong></p>
            <ul>
              <li><code>publishRLS00ResourcesValidation</code> - Validates AWS resources</li>
              <li><code>publishRLS01S3</code> - Generates and uploads CSV to S3</li>
              <li><code>publishRLS02Glue</code> - Creates/updates Glue table</li>
              <li><code>publishRLS03QsRLSDataSet</code> - Creates/updates RLS DataSet</li>
              <li><code>publishRLS04QsUpdateMainDataSetRLS</code> - Links RLS to Main DataSet</li>
              <li><code>publishRLS99QsCheckIngestion</code> - Monitors SPICE ingestion</li>
            </ul>
          </Box>

          <Box>
            <p><strong>Resource Management (4 Functions)</strong></p>
            <ul>
              <li><code>createS3Bucket</code> - Creates S3 bucket for region</li>
              <li><code>createGlueDatabase</code> - Creates Glue database</li>
              <li><code>createQSDataSource</code> - Creates QuickSight DataSource</li>
              <li><code>checkQSManagementRegionAccess</code> - Validates QuickSight access</li>
            </ul>
          </Box>

          <Box>
            <p><strong>Data Fetching (6 Functions)</strong></p>
            <ul>
              <li><code>fetchDataSetsFromQS</code> - Imports DataSets from QuickSight</li>
              <li><code>fetchDataSetFieldsFromQS</code> - Gets field metadata</li>
              <li><code>fetchUsersFromQS</code> - Syncs QuickSight users</li>
              <li><code>fetchGroupsFromQS</code> - Syncs QuickSight groups</li>
              <li><code>fetchNamespacesFromQS</code> - Gets namespace information</li>
              <li><code>fetchRLSDataSetPermissions</code> - Reads existing RLS rules</li>
            </ul>
          </Box>

          <Box>
            <p><strong>Version Management (3 Functions)</strong></p>
            <ul>
              <li><code>listPublishHistory</code> - Lists all versions</li>
              <li><code>getVersionContent</code> - Retrieves specific version</li>
              <li><code>rollbackToVersion</code> - Reverts to previous version</li>
            </ul>
          </Box>

          <Box>
            <p><strong>Deletion & Cleanup (4 Functions)</strong></p>
            <ul>
              <li><code>deleteDataSetFromQS</code> - Removes RLS DataSet</li>
              <li><code>deleteDataSetGlueTable</code> - Deletes Glue table</li>
              <li><code>deleteDataSetS3Objects</code> - Removes S3 files</li>
              <li><code>removeRLSDataSet</code> - Unlinks RLS from Main DataSet</li>
            </ul>
          </Box>

          <Box>
            <p><strong>Monitoring & Utilities (4 Functions)</strong></p>
            <ul>
              <li><code>getQSSpiceCapacity</code> - Monitors SPICE usage</li>
              <li><code>setAccount</code> - Configures account settings</li>
              <li><code>updateRLSDataSetPermissions</code> - Updates permissions</li>
              <li><code>_shared</code> - Common utilities and helpers</li>
            </ul>
          </Box>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Regional Resources</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>For each Managed Region, the following resources are created:</p>
          </Box>

          <ColumnLayout columns={3} variant="text-grid">
            <Box>
              <p><strong>S3 Bucket</strong></p>
              <p><code>qs-managed-rls-[UUID]</code></p>
              <ul>
                <li>Stores CSV files</li>
                <li>Versioning enabled</li>
                <li>Organized by DataSet ID</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Glue Database</strong></p>
              <p><code>qs-managed-rls-[UUID]</code></p>
              <ul>
                <li>Metadata catalog</li>
                <li>One table per DataSet</li>
                <li>Enables Athena queries</li>
              </ul>
            </Box>

            <Box>
              <p><strong>QuickSight DataSource</strong></p>
              <p><code>qs-managed-rls-[UUID]</code></p>
              <ul>
                <li>Athena DataSource</li>
                <li>Queries Glue tables</li>
                <li>Auto-configured</li>
              </ul>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Data Flow</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p><strong>Publishing Workflow Data Flow:</strong></p>
            <ol>
              <li><strong>User creates permissions</strong> → Stored in DynamoDB</li>
              <li><strong>User clicks publish</strong> → Lambda workflow triggered</li>
              <li><strong>CSV generated</strong> → Uploaded to S3 with versioning</li>
              <li><strong>Glue table created/updated</strong> → Metadata for CSV structure</li>
              <li><strong>RLS DataSet created/updated</strong> → QuickSight DataSet via Athena</li>
              <li><strong>RLS applied</strong> → Main DataSet linked to RLS DataSet</li>
              <li><strong>SPICE ingestion</strong> → Data loaded into QuickSight</li>
              <li><strong>Users access data</strong> → See only permitted rows</li>
            </ol>
          </Box>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Security</Header>}>
        <SpaceBetween size="m">
          <ColumnLayout columns={2} variant="text-grid">
            <Box>
              <p><strong>Authentication</strong></p>
              <ul>
                <li>Amazon Cognito User Pools</li>
                <li>Email/password authentication</li>
                <li>MFA support (optional)</li>
                <li>Session management</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Authorization</strong></p>
              <ul>
                <li>IAM roles for Lambda functions</li>
                <li>Fine-grained DynamoDB permissions</li>
                <li>S3 bucket policies</li>
                <li>QuickSight API permissions</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Encryption</strong></p>
              <ul>
                <li>Data at rest (DynamoDB, S3)</li>
                <li>Data in transit (HTTPS/TLS)</li>
                <li>AWS KMS integration</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Audit & Compliance</strong></p>
              <ul>
                <li>CloudWatch Logs</li>
                <li>CloudTrail integration</li>
                <li>Version history tracking</li>
                <li>Complete audit trail</li>
              </ul>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Known Limitations</Header>}>
        <SpaceBetween size="m">
          <Alert type="warning" header="QuickSight RLS Limitations">
            <ul>
              <li><strong>Date and Numeric Fields:</strong> RLS only works with text/string fields (QuickSight limitation)</li>
              <li><strong>File Upload DataSets:</strong> DataSets created by direct file upload cannot be managed via API</li>
              <li><strong>Single Account:</strong> Currently manages one AWS account (multi-account support planned)</li>
            </ul>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Performance Considerations</Header>}>
        <SpaceBetween size="m">
          <ColumnLayout columns={2} variant="text-grid">
            <Box>
              <p><strong>SPICE Capacity</strong></p>
              <ul>
                <li>Monitor capacity usage</li>
                <li>RLS DataSets consume SPICE</li>
                <li>Consider Direct Query for large datasets</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Publishing Time</strong></p>
              <ul>
                <li>Typical: 2-5 minutes</li>
                <li>Large datasets: up to 10 minutes</li>
                <li>SPICE ingestion is the bottleneck</li>
              </ul>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Alert type="info" header="More Information">
        <p>
          For complete technical documentation including Lambda function details and DynamoDB schemas, visit the{" "}
          <Link external href="https://github.com/AndrePhoto/QuickSight-RLS-Manager/tree/master/Guide">
            GitHub repository
          </Link>.
        </p>
      </Alert>
    </SpaceBetween>
  );
};