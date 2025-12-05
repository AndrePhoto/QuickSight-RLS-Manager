import { SpaceBetween, Header, Box, Link, Container, Alert } from "@cloudscape-design/components";

export const InstallContent = () => {
  return (
    <SpaceBetween size="l">
      <Box>
        <Header variant="h2">Installation Guide</Header>
        <p>
          This guide walks you through deploying the QuickSight RLS Manager to your AWS account using AWS Amplify.
        </p>
      </Box>

      <Container header={<Header variant="h3">Prerequisites</Header>}>
        <Alert type="info">
          <p>Before installing, ensure you have:</p>
          <ul>
            <li>✅ <strong>AWS Account</strong> with administrative access</li>
            <li>✅ <strong>Amazon QuickSight</strong> enabled and configured</li>
            <li>✅ <strong>QuickSight Enterprise Edition</strong> (required for RLS features)</li>
            <li>✅ <strong>GitHub Account</strong> for forking the repository</li>
            <li>✅ <strong>Node.js 18+</strong> and npm installed (for local development)</li>
            <li>✅ <strong>AWS CLI</strong> configured with appropriate credentials</li>
          </ul>
        </Alert>
      </Container>

      <Container header={<Header variant="h3">Installation Steps</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p><strong>Step 1: Fork the Repository</strong></p>
            <p>
              1. Go to{" "}
              <Link external href="https://github.com/AndrePhoto/QuickSight-RLS-Manager">
                https://github.com/AndrePhoto/QuickSight-RLS-Manager
              </Link>
            </p>
            <p>2. Click the "Fork" button in the top right</p>
            <p>3. Select your GitHub account as the destination</p>
          </Box>

          <Box>
            <p><strong>Step 2: Deploy with AWS Amplify</strong></p>
            <p>1. Open the AWS Amplify Console in your AWS account</p>
            <p>2. Click "New app" → "Host web app"</p>
            <p>3. Select "GitHub" as the repository service</p>
            <p>4. Authorize AWS Amplify to access your GitHub account</p>
            <p>5. Select your forked repository</p>
            <p>6. Choose the branch to deploy (typically "master" or "main")</p>
            <p>7. Review the build settings (Amplify will auto-detect them)</p>
            <p>8. Click "Save and deploy"</p>
          </Box>

          <Box>
            <p><strong>Step 3: Wait for Deployment</strong></p>
            <Alert type="info">
              <p>The deployment process typically takes 15-20 minutes and includes:</p>
              <ul>
                <li>Provisioning AWS resources (DynamoDB, Lambda, S3, etc.)</li>
                <li>Building the frontend application</li>
                <li>Deploying the backend infrastructure</li>
                <li>Setting up authentication (Cognito)</li>
              </ul>
            </Alert>
          </Box>

          <Box>
            <p><strong>Step 4: Access the Application</strong></p>
            <p>1. Once deployment is complete, Amplify will provide a URL</p>
            <p>2. Click the URL to access your RLS Manager</p>
            <p>3. You'll be prompted to create an admin user account</p>
            <p>4. Sign in with your new credentials</p>
          </Box>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">Local Development (Optional)</Header>}>
        <SpaceBetween size="m">
          <Box>
            <p>If you want to run the application locally for development:</p>
          </Box>

          <Box>
            <p><strong>Clone and Install</strong></p>
            <pre style={{ backgroundColor: '#f4f4f4', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
              <code>{`# Clone your forked repository
git clone https://github.com/YOUR-USERNAME/QuickSight-RLS-Manager.git
cd QuickSight-RLS-Manager

# Install dependencies
npm install`}</code>
            </pre>
          </Box>

          <Box>
            <p><strong>Configure Amplify</strong></p>
            <pre style={{ backgroundColor: '#f4f4f4', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
              <code>{`# Configure Amplify CLI
npx amplify configure

# Initialize Amplify
npx amplify init

# Push backend resources
npx amplify push`}</code>
            </pre>
          </Box>

          <Box>
            <p><strong>Run Development Server</strong></p>
            <pre style={{ backgroundColor: '#f4f4f4', padding: '15px', borderRadius: '5px', overflow: 'auto' }}>
              <code>{`# Start the development server
npm run dev

# Application will be available at http://localhost:5173`}</code>
            </pre>
          </Box>
        </SpaceBetween>
      </Container>

      <Container header={<Header variant="h3">AWS Resources Created</Header>}>
        <Box>
          <p>The installation will create the following AWS resources:</p>
          <ul>
            <li><strong>AWS Amplify</strong> - Hosting and CI/CD</li>
            <li><strong>Amazon Cognito</strong> - User authentication</li>
            <li><strong>Amazon DynamoDB</strong> - 5 tables for data storage</li>
            <li><strong>AWS Lambda</strong> - 27 functions for automation</li>
            <li><strong>AWS AppSync</strong> - GraphQL API</li>
            <li><strong>AWS IAM</strong> - Roles and policies</li>
          </ul>
          <p><em>Note: Regional resources (S3, Glue, DataSource) are created during initialization.</em></p>
        </Box>
      </Container>

      <Container header={<Header variant="h3">Estimated Costs</Header>}>
        <Alert type="info" header="Monthly Cost Estimate">
          <p>Typical monthly costs (varies by usage):</p>
          <ul>
            <li><strong>AWS Amplify:</strong> ~$5-20/month (hosting and build minutes)</li>
            <li><strong>Amazon QuickSight:</strong> Based on your existing subscription</li>
            <li><strong>SPICE Capacity:</strong> Based on RLS DataSet sizes</li>
            <li><strong>DynamoDB:</strong> ~$5-10/month (on-demand pricing)</li>
            <li><strong>Lambda:</strong> ~$1-5/month (within free tier for most use cases)</li>
            <li><strong>S3:</strong> ~$1-5/month (storage and requests)</li>
            <li><strong>Glue:</strong> ~$1-5/month (catalog storage)</li>
          </ul>
          <p><strong>Estimated Total:</strong> $50-200/month depending on scale</p>
        </Alert>
      </Container>

      <Container header={<Header variant="h3">Troubleshooting</Header>}>
        <SpaceBetween size="m">
          <Alert type="warning" header="Deployment Failed">
            <ul>
              <li>Check that you have sufficient IAM permissions in your AWS account</li>
              <li>Verify that QuickSight is enabled in your account</li>
              <li>Review the Amplify build logs for specific errors</li>
              <li>Ensure your AWS region supports all required services</li>
            </ul>
          </Alert>

          <Alert type="warning" header="Cannot Access Application">
            <ul>
              <li>Wait for deployment to fully complete (check Amplify console)</li>
              <li>Clear your browser cache and try again</li>
              <li>Check that the Amplify URL is correct</li>
              <li>Verify that Cognito user pool was created successfully</li>
            </ul>
          </Alert>
        </SpaceBetween>
      </Container>

      <Alert type="success" header="Next Steps">
        <p>
          Once installation is complete, proceed to the{" "}
          <Link href="/guide" onFollow={(e) => { e.preventDefault(); }}>
            Initialization Guide
          </Link>
          {" "}to configure your QuickSight regions and start managing RLS.
        </p>
      </Alert>
    </SpaceBetween>
  );
};