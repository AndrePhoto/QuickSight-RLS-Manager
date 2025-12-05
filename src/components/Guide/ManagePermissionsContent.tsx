import { SpaceBetween, Header, Box, Link, Container, Alert, ColumnLayout } from "@cloudscape-design/components";

export const ManagePermissionsContent = () => {
  return (
    <SpaceBetween size="l">
      <Box>
        <Header variant="h2">Managing Permissions</Header>
        <p>
          This guide explains how to create, edit, publish, and manage RLS permissions using the RLS Manager.
        </p>
      </Box>

      <Container header={<Header variant="h3">Quick Start</Header>}>
        <ColumnLayout columns={4} variant="text-grid">
          <Box>
            <p><strong>1. Select DataSet</strong></p>
            <p>Choose the DataSet you want to secure with RLS</p>
          </Box>

          <Box>
            <p><strong>2. Add Permissions</strong></p>
            <p>Define who can see what data</p>
          </Box>

          <Box>
            <p><strong>3. Publish</strong></p>
            <p>Click Publish to apply to QuickSight</p>
          </Box>

          <Box>
            <p><strong>4. Verify</strong></p>
            <p>Test with different users</p>
          </Box>
        </ColumnLayout>
      </Container>

      <Container header={<Header variant="h3">Creating Permissions</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p><strong>To create a new permission:</strong></p>
            <ol>
              <li>Go to <Link href="/manage-permissions">Manage Permissions</Link></li>
              <li>Select a DataSet from the dropdown</li>
              <li>Click "Add Permission"</li>
              <li>Choose User or Group</li>
              <li>Select the user/group name</li>
              <li>Select the field to filter</li>
              <li>Enter the allowed value(s)</li>
              <li>Click "Save"</li>
            </ol>
          </Box>

          <Alert type="info" header="Permission Format">
            <p>Each permission defines:</p>
            <ul>
              <li><strong>Who:</strong> A specific user (email) or group name</li>
              <li><strong>Field:</strong> The DataSet field to filter on</li>
              <li><strong>Value:</strong> The value(s) that user/group can see</li>
            </ul>
            <p><strong>Example:</strong> User "john@example.com" can see Region = "US"</p>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Wildcards</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>The RLS Manager supports wildcards for flexible permissions:</p>
          </Box>

          <ColumnLayout columns={2} variant="text-grid">
            <Box>
              <p><strong>* (All Fields)</strong></p>
              <p>Use <code>*</code> as the field name to grant access to all fields</p>
              <p><strong>Example:</strong> User can see all data (no filtering)</p>
            </Box>

            <Box>
              <p><strong>* (All Values)</strong></p>
              <p>Use <code>*</code> as the value to grant access to all values for that field</p>
              <p><strong>Example:</strong> User can see all regions</p>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Publishing Permissions</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p><strong>To publish permissions to QuickSight:</strong></p>
            <ol>
              <li>Review your permissions in the table</li>
              <li>Click the "Publish" button</li>
              <li>Confirm the publish action</li>
              <li>Monitor the 6-step workflow progress</li>
              <li>Wait for "Success" status</li>
            </ol>
          </Box>

          <Alert type="info" header="What Happens During Publishing">
            <p>The automated workflow:</p>
            <ol>
              <li>Validates all resources exist</li>
              <li>Generates CSV file from permissions</li>
              <li>Uploads CSV to S3 with versioning</li>
              <li>Creates/updates Glue table</li>
              <li>Creates/updates RLS DataSet in QuickSight</li>
              <li>Links RLS DataSet to your Main DataSet</li>
              <li>Monitors SPICE ingestion completion</li>
            </ol>
            <p><strong>Duration:</strong> Typically 2-5 minutes</p>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Permission Status</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>Permissions can have different statuses:</p>
          </Box>

          <ColumnLayout columns={2} variant="text-grid">
            <Box>
              <p><strong>PENDING</strong></p>
              <p>Permission has been created but not yet published to QuickSight</p>
            </Box>

            <Box>
              <p><strong>PUBLISHED</strong></p>
              <p>Permission is active in QuickSight and enforcing RLS</p>
            </Box>

            <Box>
              <p><strong>FAILED</strong></p>
              <p>Publishing failed - check logs for details</p>
            </Box>

            <Box>
              <p><strong>MANUAL</strong></p>
              <p>DataSet requires manual CSV upload (not API-manageable)</p>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Copying Permissions</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>You can copy permissions from one DataSet to another:</p>
            <ol>
              <li>Select the destination DataSet</li>
              <li>Click "Copy from Another DataSet"</li>
              <li>Select the source DataSet</li>
              <li>Review compatible permissions (fields must match)</li>
              <li>Click "Copy Permissions"</li>
              <li>Publish to apply</li>
            </ol>
          </Box>

          <Alert type="info">
            <p><strong>Compatibility Check:</strong></p>
            <p>
              Permissions are only copied if the field names exist in the destination DataSet. 
              Permissions with <code>*</code> (All Fields) are always compatible.
            </p>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Version History & Rollback</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>Every publish creates a new version. You can view history and rollback:</p>
            <ol>
              <li>Click "View History" on the Manage Permissions page</li>
              <li>See all previous versions with timestamps</li>
              <li>Click "Rollback" on any version to revert</li>
              <li>Confirm the rollback action</li>
            </ol>
          </Box>

          <Alert type="warning">
            <p><strong>Note:</strong> Rollback creates a new version - it doesn't delete history.</p>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Bulk Operations</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p><strong>Export Permissions</strong></p>
            <p>Download permissions as CSV for backup or bulk editing:</p>
            <ol>
              <li>Select a DataSet</li>
              <li>Click "Export CSV"</li>
              <li>Save the CSV file</li>
            </ol>
          </Box>

          <Box>
            <p><strong>Import Permissions</strong></p>
            <p>Upload a CSV file to create multiple permissions at once:</p>
            <ol>
              <li>Prepare CSV with format: UserName,GroupName,field1,field2...</li>
              <li>Click "Import CSV"</li>
              <li>Select your CSV file</li>
              <li>Review imported permissions</li>
              <li>Click "Save" then "Publish"</li>
            </ol>
          </Box>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Best Practices</Header>}>
        <SpaceBetween size="m">
          <Alert type="success" header="Recommendations">
            <ul>
              <li><strong>Test First:</strong> Create permissions for a test user before rolling out to all users</li>
              <li><strong>Use Groups:</strong> Assign permissions to groups rather than individual users when possible</li>
              <li><strong>Document Changes:</strong> Use version history to track what changed and when</li>
              <li><strong>Regular Backups:</strong> Export permissions periodically as CSV backups</li>
              <li><strong>Monitor SPICE:</strong> Keep an eye on SPICE capacity usage</li>
              <li><strong>Verify Results:</strong> Always test with actual users after publishing</li>
            </ul>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Troubleshooting</Header>}>
        <SpaceBetween size="m">
          <Alert type="warning" header="User Can't See Expected Data">
            <ul>
              <li>Verify user name matches exactly (case-sensitive)</li>
              <li>Check that permission was published (not PENDING)</li>
              <li>Wait for SPICE ingestion to complete</li>
              <li>Verify field values match data in DataSet</li>
            </ul>
          </Alert>

          <Alert type="warning" header="Publishing Takes Too Long">
            <ul>
              <li>Check SPICE capacity availability</li>
              <li>Large DataSets may take longer to ingest</li>
              <li>Review CloudWatch logs for bottlenecks</li>
            </ul>
          </Alert>
        </SpaceBetween>
      </Container>

      <Alert type="info" header="Need Help?">
        <p>
          For more detailed information, see the{" "}
          <Link href="/guide" onFollow={(e) => { e.preventDefault(); }}>
            Complete Guide
          </Link>
          {" "}or{" "}
          <Link href="/guide" onFollow={(e) => { e.preventDefault(); }}>
            Technical Documentation
          </Link>.
        </p>
      </Alert>
    </SpaceBetween>
  );
};