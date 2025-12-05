import { SpaceBetween, Header, Box, Link, Container, ColumnLayout, Alert } from "@cloudscape-design/components";

export const CompleteGuideContent = () => {
  return (
    <SpaceBetween size="l">
      <Box>
        <Header variant="h2">Complete Guide</Header>
        <p>
          Welcome to the comprehensive guide for the QuickSight RLS Manager - a solution designed to simplify 
          the management of Row-Level Security in Amazon QuickSight.
        </p>
      </Box>

      <Container header={<Header variant="h3">Core Concepts</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p><strong>DataSet Types</strong></p>
            <ColumnLayout columns={2} variant="text-grid">
              <Box>
                <strong>Main DataSet</strong> (DataSet to be Secured):
                <ul>
                  <li>The QuickSight DataSet containing your business data</li>
                  <li>The DataSet you want to protect with RLS</li>
                  <li>Users will see filtered rows based on RLS rules</li>
                  <li>Example: Sales data, customer information, financial reports</li>
                </ul>
              </Box>

              <Box>
                <strong>RLS DataSet</strong>:
                <ul>
                  <li>A special DataSet containing permission rules</li>
                  <li>Defines who can see which rows in the Main DataSet</li>
                  <li>Created and managed automatically by the RLS Manager</li>
                  <li>Format: UserName,GroupName,field1,field2,field3...</li>
                  <li>Tagged with RLS-Manager: True for identification</li>
                </ul>
              </Box>
            </ColumnLayout>
          </Box>

          <Box>
            <p><strong>Key Terms</strong></p>
            <ul>
              <li><strong>Management Region</strong> - The AWS region where QuickSight users, groups, and authentication are managed (typically us-east-1)</li>
              <li><strong>Managed Region</strong> - AWS regions where you want to manage RLS DataSets (can be different from Management Region)</li>
              <li><strong>Permission</strong> - A single rule defining access for a user/group to specific data</li>
              <li><strong>Publishing</strong> - The process of applying permissions to QuickSight (6 automated steps)</li>
            </ul>
          </Box>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Workflow Overview</Header>}>
        <SpaceBetween size="m">
          <ColumnLayout columns={3} variant="text-grid">
            <Box>
              <p><strong>1. 📝 Create Permissions</strong></p>
              <ul>
                <li>Define who (users/groups) can see what data (field values)</li>
                <li>Use the intuitive web interface</li>
                <li>Permissions are stored in DynamoDB</li>
                <li>Status: PENDING (not yet applied to QuickSight)</li>
              </ul>
            </Box>

            <Box>
              <p><strong>2. 🚀 Publish to QuickSight</strong></p>
              <ul>
                <li>Click "Publish" to apply permissions</li>
                <li>Automated 6-step workflow executes</li>
                <li>Each step is a separate Lambda function for reliability</li>
                <li>Status updates to PUBLISHED on success</li>
              </ul>
            </Box>

            <Box>
              <p><strong>3. ✅ Verify Results</strong></p>
              <ul>
                <li>Monitor SPICE ingestion progress</li>
                <li>Test with different users to verify RLS works</li>
                <li>Check audit logs and version history</li>
              </ul>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Publishing Workflow (6 Steps)</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>The <strong>Publish</strong> operation is fully automated and consists of:</p>
          </Box>

          <ColumnLayout columns={2} variant="text-grid">
            <Box>
              <p><strong>Step 0: 🔍 Validation</strong></p>
              <ul>
                <li>Verify all AWS resources exist</li>
                <li>Check IAM permissions</li>
                <li>Validate DataSet is manageable via API</li>
                <li><strong>Duration:</strong> ~5 seconds</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Step 1: 📁 S3 Upload</strong></p>
              <ul>
                <li>Generate CSV file from permissions</li>
                <li>Upload to S3 with versioning</li>
                <li>Validate CSV headers and format</li>
                <li><strong>Duration:</strong> ~10 seconds</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Step 2: 🗃️ Glue Table</strong></p>
              <ul>
                <li>Create or update Glue table metadata</li>
                <li>Define schema for CSV structure</li>
                <li>Configure SerDe for CSV parsing</li>
                <li><strong>Duration:</strong> ~15 seconds</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Step 3: 📊 RLS DataSet</strong></p>
              <ul>
                <li>Create or update QuickSight RLS DataSet</li>
                <li>Connect to Glue table via Athena</li>
                <li>Configure SPICE ingestion</li>
                <li><strong>Duration:</strong> ~30 seconds</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Step 4: 🔗 Apply RLS</strong></p>
              <ul>
                <li>Link RLS DataSet to Main DataSet</li>
                <li>Preserve all existing DataSet settings</li>
                <li>Handle both legacy and new data prep</li>
                <li><strong>Duration:</strong> ~20 seconds</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Step 99: ⏳ Check Ingestion</strong></p>
              <ul>
                <li>Monitor SPICE ingestion progress</li>
                <li>Wait for completion (if needed)</li>
                <li>Verify successful data load</li>
                <li><strong>Duration:</strong> 0-300 seconds</li>
              </ul>
            </Box>
          </ColumnLayout>

          <Alert type="info">
            <strong>Total Time:</strong>
            <ul>
              <li><strong>Minimum:</strong> ~80 seconds (no ingestion needed)</li>
              <li><strong>Typical:</strong> 2-5 minutes (with SPICE ingestion)</li>
              <li><strong>Maximum:</strong> 10 minutes (large datasets)</li>
            </ul>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Version Control</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>Every permission change is tracked with full version control:</p>
          </Box>

          <ColumnLayout columns={2} variant="text-grid">
            <Box>
              <p><strong>Automatic Versioning</strong></p>
              <ul>
                <li><strong>Version Numbers</strong> - Incremental version numbers (1, 2, 3...)</li>
                <li><strong>Timestamps</strong> - When each version was published</li>
                <li><strong>S3 Versioning</strong> - Complete CSV file history</li>
                <li><strong>Metadata</strong> - Who published, permission count, status</li>
              </ul>
            </Box>

            <Box>
              <p><strong>Rollback Capabilities</strong></p>
              <ul>
                <li><strong>One-Click Rollback</strong> - Revert to any previous version</li>
                <li><strong>Preview Before Rollback</strong> - See exactly what will change</li>
                <li><strong>Safe Rollback</strong> - Creates new version (doesn't delete history)</li>
                <li><strong>Audit Trail</strong> - Track all rollback operations</li>
              </ul>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Troubleshooting</Header>}>
        <SpaceBetween size="m">
          <Alert type="warning" header="Publishing Fails at Step 0 (Validation)">
            <ul>
              <li>Check AWS resources exist (S3 bucket, Glue database, DataSource)</li>
              <li>Verify IAM permissions</li>
              <li>Ensure QuickSight is enabled</li>
            </ul>
          </Alert>

          <Alert type="warning" header="Publishing Fails at Step 3 (RLS DataSet)">
            <ul>
              <li>Check SPICE capacity availability</li>
              <li>Verify DataSource connectivity</li>
              <li>Ensure Glue table is accessible</li>
            </ul>
          </Alert>

          <Alert type="warning" header="RLS Not Working After Publishing">
            <ul>
              <li>Wait for SPICE ingestion to complete</li>
              <li>Verify user names match exactly</li>
              <li>Check permission field values</li>
              <li>Test with QuickSight console</li>
            </ul>
          </Alert>
        </SpaceBetween>
      </Container>

      <Alert type="info" header="Need More Details?">
        <p>
          For detailed technical documentation, see the{" "}
          <Link href="/guide" onFollow={(e) => { e.preventDefault(); }}>
            Technical Docs tab
          </Link>
          {" "}or visit the{" "}
          <Link external href="https://github.com/AndrePhoto/QuickSight-RLS-Manager/tree/master/Guide">
            GitHub repository
          </Link>.
        </p>
      </Alert>
    </SpaceBetween>
  );
};