import { SpaceBetween, Header, Box, Link, Alert, ColumnLayout, Container } from "@cloudscape-design/components";

export const OverviewContent = () => {
  return (
    <SpaceBetween size="l">
      <Box>
        <Header variant="h2">Overview</Header>
        <p>
          The <strong>QuickSight RLS Manager</strong> simplifies the complex process of managing Row-Level Security in Amazon QuickSight. 
          Instead of manually creating and updating CSV files or building custom database infrastructure, this solution provides a visual 
          interface to create, edit, and publish RLS permissions with full automation, version control, and audit trails.
        </p>
      </Box>

      <Container header={<Header variant="h3">The Problem</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>Managing Row-Level Security in QuickSight presents several challenges:</p>
          </Box>
          
          <Alert type="error" header="User/Group-Based RLS Challenges">
            <ul>
              <li><strong>Manual CSV Management</strong> - Requires creating and maintaining CSV files in specific format</li>
              <li><strong>Complex Format</strong> - CSV must follow exact format: UserName,field1,field2... OR GroupName,field1,field2...</li>
              <li><strong>Two Bad Options</strong>:
                <ul>
                  <li>Upload CSV manually for every change (tedious, error-prone)</li>
                  <li>Build and maintain database infrastructure (complex, costly)</li>
                </ul>
              </li>
              <li><strong>Error-Prone Process</strong> - Manual editing can expose wrong data to wrong users</li>
              <li><strong>No Version Control</strong> - Difficult to track changes or rollback mistakes</li>
              <li><strong>Difficult to Scale</strong> - Managing hundreds of users becomes unmanageable</li>
              <li><strong>No Audit Trail</strong> - Can't track who changed what and when</li>
              <li><strong>Schema Changes</strong> - DataSet changes require manual CSV updates</li>
              <li><strong>No Visibility</strong> - Hard to understand who can see what data</li>
              <li><strong>Infrastructure Overhead</strong> - Must build and maintain supporting infrastructure</li>
            </ul>
          </Alert>

          <Box>
            <p>
              <strong>Reference:</strong>{" "}
              <Link external href="https://docs.aws.amazon.com/quicksight/latest/user/restrict-access-to-a-data-set-using-row-level-security.html">
                AWS QuickSight RLS Documentation
              </Link>
            </p>
          </Box>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">The Solution</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>The <strong>QuickSight RLS Manager</strong> transforms RLS management through:</p>
          </Box>

          <Alert type="success" header="Key Benefits">
            <ul>
              <li><strong>Visual Interface</strong> - Intuitive web UI for creating and managing permissions</li>
              <li><strong>Automated Publishing</strong> - One-click deployment to QuickSight</li>
              <li><strong>Infrastructure Included</strong> - All supporting infrastructure deployed and maintained for you</li>
              <li><strong>No Manual Uploads</strong> - Automated CSV generation and publishing</li>
              <li><strong>No Database Maintenance</strong> - S3, Glue, and Athena automatically configured</li>
              <li><strong>Version Control</strong> - Track all changes with rollback capability</li>
              <li><strong>Audit Trail</strong> - Complete history of who changed what and when</li>
              <li><strong>Multi-Region Support</strong> - Manage RLS across multiple AWS regions</li>
              <li><strong>Error Prevention</strong> - Validation before publishing prevents mistakes</li>
              <li><strong>Centralized Management</strong> - Single interface for all DataSets</li>
              <li><strong>AWS Amplify Powered</strong> - Complete infrastructure as code deployment</li>
            </ul>
          </Alert>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">How It Works</Header>}>
        <SpaceBetween size="m">
          <ColumnLayout columns={3} variant="text-grid">
            <Box>
              <p><strong>1. Create Permissions</strong></p>
              <ul>
                <li>Use Web UI</li>
                <li>Add Users/Groups</li>
                <li>Define Rules</li>
              </ul>
              <p>↓</p>
              <p>Stored in DynamoDB</p>
            </Box>

            <Box>
              <p><strong>2. Publish</strong></p>
              <ul>
                <li>Automated 6-Step Workflow</li>
                <li>CSV → S3 → Glue</li>
                <li>→ QuickSight RLS</li>
              </ul>
              <p>↓</p>
              <p>All automated</p>
            </Box>

            <Box>
              <p><strong>3. Verify</strong></p>
              <ul>
                <li>Monitor Status</li>
                <li>Test with Users</li>
                <li>Check Results</li>
              </ul>
              <p>↓</p>
              <p>RLS Active in QuickSight</p>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Key Features</Header>}>
        <ColumnLayout columns={2} variant="text-grid">
          <Box>
            <p><strong>🎯 Core Capabilities</strong></p>
            <ul>
              <li><strong>Visual Permission Management</strong> - Create, edit, and delete permissions through intuitive UI</li>
              <li><strong>Automated Publishing</strong> - 6-step automated workflow applies changes to QuickSight</li>
              <li><strong>Multi-Region Support</strong> - Manage RLS across multiple AWS regions from single interface</li>
              <li><strong>Version Control</strong> - Every publish creates a new version with rollback capability</li>
              <li><strong>Audit Trail</strong> - Complete history of all permission changes with timestamps</li>
              <li><strong>Error Recovery</strong> - Comprehensive error handling and retry logic</li>
            </ul>
          </Box>

          <Box>
            <p><strong>🔧 Advanced Features</strong></p>
            <ul>
              <li><strong>Bulk Operations</strong> - Import/export permissions via CSV for bulk updates</li>
              <li><strong>Permission Templates</strong> - Reusable permission patterns for common scenarios</li>
              <li><strong>User/Group Sync</strong> - Automatic synchronization with QuickSight</li>
              <li><strong>SPICE Monitoring</strong> - Real-time capacity tracking and alerts</li>
              <li><strong>GraphQL API</strong> - Programmatic access for automation</li>
              <li><strong>Status Tracking</strong> - PENDING, PUBLISHED, FAILED, and MANUAL status indicators</li>
            </ul>
          </Box>
        </ColumnLayout>
      </Container>

      <Container header={<Header variant="h3">Getting Started</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p><strong>Total Setup Time:</strong> ~30-45 minutes</p>
          </Box>

          <ColumnLayout columns={3} variant="text-grid">
            <Box>
              <p><strong>1. Install (15-20 min)</strong></p>
              <p>Deploy the RLS Manager to your AWS account using AWS Amplify</p>
              <p>
                <Link href="/guide" onFollow={(e) => { e.preventDefault(); }}>
                  See Installation Guide →
                </Link>
              </p>
            </Box>

            <Box>
              <p><strong>2. Initialize (10-15 min)</strong></p>
              <p>Configure your QuickSight regions and resources</p>
              <p>
                <Link href="/guide" onFollow={(e) => { e.preventDefault(); }}>
                  See Initialization Guide →
                </Link>
              </p>
            </Box>

            <Box>
              <p><strong>3. Manage (5-10 min)</strong></p>
              <p>Create and publish your first RLS permissions</p>
              <p>
                <Link href="/manage-permissions">
                  Go to Manage Permissions →
                </Link>
              </p>
            </Box>
          </ColumnLayout>
        </SpaceBetween>
      </Container>

      <Alert type="info" header="External Resources">
        <SpaceBetween size="xs">
          <Box>
            <Link external href="https://github.com/AndrePhoto/QuickSight-RLS-Manager">
              GitHub Repository
            </Link>
          </Box>
          <Box>
            <Link external href="https://docs.aws.amazon.com/quicksight/latest/user/restrict-access-to-a-data-set-using-row-level-security.html">
              AWS QuickSight RLS Documentation
            </Link>
          </Box>
          <Box>
            <Link external href="https://docs.amplify.aws/react/">
              AWS Amplify Documentation
            </Link>
          </Box>
        </SpaceBetween>
      </Alert>
    </SpaceBetween>
  );
};