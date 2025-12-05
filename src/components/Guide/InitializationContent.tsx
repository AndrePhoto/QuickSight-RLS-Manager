import { SpaceBetween, Header, Box, Link, Container, Alert, ColumnLayout } from "@cloudscape-design/components";

export const InitializationContent = () => {
  return (
    <SpaceBetween size="l">
      <Box>
        <Header variant="h2">Initialization Guide</Header>
        <p>
          After installing the RLS Manager, you need to configure your QuickSight regions and resources. 
          This process takes approximately 10-15 minutes.
        </p>
      </Box>

      <Container header={<Header variant="h3">Overview</Header>}>
        <ColumnLayout columns={3} variant="text-grid">
          <Box>
            <p><strong>Step 1</strong></p>
            <p><strong>Set Management Region</strong></p>
            <p>Configure where QuickSight users and groups are managed</p>
          </Box>

          <Box>
            <p><strong>Step 2</strong></p>
            <p><strong>Add Managed Regions</strong></p>
            <p>Add regions where your DataSets are located</p>
          </Box>

          <Box>
            <p><strong>Step 3</strong></p>
            <p><strong>Import DataSets</strong></p>
            <p>Sync your existing QuickSight DataSets</p>
          </Box>
        </ColumnLayout>
      </Container>

      <Container header={<Header variant="h3">Step 1: Set Management Region</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>The Management Region is where QuickSight users, groups, and authentication are managed.</p>
          </Box>

          <Alert type="info">
            <p><strong>How to find your Management Region:</strong></p>
            <ol>
              <li>Open the QuickSight console</li>
              <li>Look at the URL - it will show your region (e.g., us-east-1)</li>
              <li>This is typically the region where you first created your QuickSight account</li>
            </ol>
          </Alert>

          <Box>
            <p><strong>To set the Management Region:</strong></p>
            <ol>
              <li>Go to the <Link href="/">Global Settings</Link> page</li>
              <li>Click "Set Management Region"</li>
              <li>Select your QuickSight Management Region from the dropdown</li>
              <li>Click "Save"</li>
            </ol>
          </Box>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Step 2: Add Managed Regions</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>Managed Regions are where your DataSets and RLS rules are deployed.</p>
          </Box>

          <Alert type="info">
            <p><strong>Important:</strong> For each Managed Region, the RLS Manager will automatically create:</p>
            <ul>
              <li>S3 bucket for CSV files</li>
              <li>Glue database for metadata</li>
              <li>QuickSight DataSource (Athena)</li>
            </ul>
          </Alert>

          <Box>
            <p><strong>To add a Managed Region:</strong></p>
            <ol>
              <li>Go to the <Link href="/">Global Settings</Link> page</li>
              <li>Click "Add Managed Region"</li>
              <li>Select the AWS region where your DataSets are located</li>
              <li>Click "Create Resources"</li>
              <li>Wait for resource creation to complete (~2-3 minutes)</li>
              <li>Repeat for each region where you have DataSets</li>
            </ol>
          </Box>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Step 3: Import DataSets</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>After adding Managed Regions, import your existing QuickSight DataSets.</p>
          </Box>

          <Box>
            <p><strong>To import DataSets:</strong></p>
            <ol>
              <li>Go to the <Link href="/">Global Settings</Link> page</li>
              <li>Click "Sync DataSets" or "Import DataSets"</li>
              <li>The tool will fetch all DataSets from your QuickSight account</li>
              <li>Wait for the sync to complete</li>
              <li>Go to <Link href="/datasets-list">DataSets List</Link> to view imported DataSets</li>
            </ol>
          </Box>

          <Alert type="success">
            <p><strong>What gets imported:</strong></p>
            <ul>
              <li>DataSet names and IDs</li>
              <li>Field names and types</li>
              <li>Current RLS status</li>
              <li>Data prep mode (new/old)</li>
              <li>API manageability status</li>
            </ul>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">QuickSight Permissions</Header>}>
        <SpaceBetween size="m">
          <Alert type="warning" header="Required IAM Permissions">
            <p>The RLS Manager needs the following QuickSight permissions:</p>
            <ul>
              <li><code>quicksight:DescribeDataSet</code></li>
              <li><code>quicksight:ListDataSets</code></li>
              <li><code>quicksight:CreateDataSet</code></li>
              <li><code>quicksight:UpdateDataSet</code></li>
              <li><code>quicksight:DeleteDataSet</code></li>
              <li><code>quicksight:DescribeDataSource</code></li>
              <li><code>quicksight:CreateDataSource</code></li>
              <li><code>quicksight:ListUsers</code></li>
              <li><code>quicksight:ListGroups</code></li>
              <li><code>quicksight:DescribeAccountSettings</code></li>
            </ul>
            <p>These permissions are automatically configured during Amplify deployment.</p>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Verification</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p><strong>Verify your initialization was successful:</strong></p>
          </Box>

          <ColumnLayout columns={2} variant="text-grid">
            <Box>
              <p><strong>✅ Check Global Settings</strong></p>
              <ul>
                <li>Management Region is set</li>
                <li>At least one Managed Region is configured</li>
                <li>Resources show "Created" status</li>
              </ul>
            </Box>

            <Box>
              <p><strong>✅ Check DataSets List</strong></p>
              <ul>
                <li>Your DataSets appear in the list</li>
                <li>Field information is populated</li>
                <li>RLS status is shown correctly</li>
              </ul>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Troubleshooting</Header>}>
        <SpaceBetween size="m">
          <Alert type="warning" header="Resource Creation Failed">
            <ul>
              <li>Check IAM permissions for S3, Glue, and QuickSight</li>
              <li>Verify the region supports all required services</li>
              <li>Check CloudWatch logs for specific errors</li>
              <li>Try deleting and recreating the Managed Region</li>
            </ul>
          </Alert>

          <Alert type="warning" header="DataSets Not Importing">
            <ul>
              <li>Verify QuickSight is enabled in the selected region</li>
              <li>Check that you have DataSets in QuickSight</li>
              <li>Ensure the Management Region is set correctly</li>
              <li>Review Lambda function logs for errors</li>
            </ul>
          </Alert>
        </SpaceBetween>
      </Container>

      <Alert type="success" header="Next Steps">
        <p>
          Once initialization is complete, you're ready to start managing permissions! Go to{" "}
          <Link href="/manage-permissions">Manage Permissions</Link> to create your first RLS rules.
        </p>
      </Alert>
    </SpaceBetween>
  );
};