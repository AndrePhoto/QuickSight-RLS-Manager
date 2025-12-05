# RLS Manager: Initialization Guide

This guide walks you through the initial setup of the QuickSight RLS Manager. Complete these steps once after installation to configure your environment.

## Overview

The initialization process consists of three main steps:

1. 🌍 [**Set up QuickSight Management Region**](#set-up-quicksight-management-region) - Configure your primary QuickSight region
2. 📍 [**Add QuickSight Regions**](#add-quicksight-regions) - Enable RLS management in specific AWS regions
3. 🔐 [**Configure QuickSight Permissions**](#quicksight-permissions) - Grant necessary S3 access

**Time Required**: 10-15 minutes

**Prerequisites**:
- RLS Manager successfully installed (see [Installation Guide](Install.md))
- QuickSight Enterprise edition enabled
- Admin access to QuickSight console
- IAM permissions to create S3 buckets, Glue databases, and QuickSight DataSources

## Step 1: Set up QuickSight Management Region

The **Management Region** is the AWS region where your QuickSight account was originally created and where user/group management occurs.

### What is the Management Region?

- **Primary QuickSight Region**: Where you first created your QuickSight account
- **User Management**: Where QuickSight users, groups, and authentication are managed
- **Typically**: `us-east-1` or your organization's primary region
- **Important**: This is different from where your DataSets are located (Managed Regions)

### Configuration Steps

1. **Open the RLS Manager** web application
2. **Select your Management Region** from the dropdown
3. **Click Submit** to begin initialization

### What Happens During Initialization

When you submit, the RLS Manager executes the [`doAccountInit()`](/Guide/hooks/doAccountInit.md) Lambda function, which:

✅ **Validates Access** - Ensures API access to the specified region (checks for SCP restrictions)
✅ **Initializes DynamoDB** - Creates account configuration records
✅ **Fetches QuickSight Namespaces** - Retrieves namespace information
✅ **Syncs Groups** - Imports all QuickSight groups
✅ **Syncs Users** - Imports all QuickSight users

**Duration**: ~30-60 seconds

### Monitoring Progress

You can track the initialization status in two places:

1. **Status and Logs Section** - Real-time progress in the RLS Manager UI
2. **Amazon CloudWatch** - Detailed Lambda execution logs

![Guide-Initialization.png](/Guide/images/Guide-Initialization.png)

### Success Confirmation

Once initialization completes successfully, you'll see:

- ✅ Management Region confirmed
- 📊 QuickSight account information
- 👥 Number of users and groups synced
- 📁 Namespace details

![Guide-Initialization.png](/Guide/images/Guide-InitializationSuccess.png)

### Troubleshooting

**Error: "Cannot access QuickSight in this region"**
- Verify QuickSight is enabled in the selected region
- Check for Service Control Policies (SCPs) blocking API access
- Ensure IAM permissions are correctly configured

**Error: "No QuickSight account found"**
- Confirm you've subscribed to QuickSight in this region
- Verify you're using the correct AWS account

## Step 2: Add QuickSight Regions

After configuring the Management Region, you can enable RLS management in specific AWS regions where your DataSets are located.

### What are Managed Regions?

**Managed Regions** are AWS regions where:
- Your QuickSight DataSets are located
- RLS rules will be deployed and applied
- Regional resources (S3, Glue, DataSource) are created
- Can be different from the Management Region

### Adding a Region

1. **Navigate to Active QuickSight Regions** section
2. **Click "Add Regions"**
3. **Select one or more regions** from the dropdown
4. **Click Submit** to begin region setup

### Automated Resource Creation

For each selected region, the RLS Manager automatically creates ([`regionSetup()`](/Guide/hooks/regionSetup.md)):

#### 📁 [Amazon S3 Bucket](/amplify/functions/createS3Bucket/README.md)
- **Name**: `qs-managed-rls-[UUID]`
- **Purpose**: Stores RLS CSV files
- **Features**: Versioning enabled for rollback capability
- **Location**: Same region as selected

#### 🗃️ [AWS Glue Database](/amplify/functions/createGlueDatabase/README.md)
- **Name**: `qs-managed-rls-[UUID]`
- **Purpose**: Metadata catalog for RLS tables
- **Integration**: Accessible via Amazon Athena
- **Usage**: Enables QuickSight to query RLS data

#### 📊 [Amazon QuickSight DataSource](/amplify/functions/createQSDataSource/README.md)
- **Name**: `qs-managed-rls-[UUID]`
- **Type**: Athena DataSource
- **Purpose**: Connects QuickSight to Glue tables
- **Configuration**: Automatically configured with correct permissions

**Duration**: ~2-3 minutes per region

### Monitoring Setup Progress

Track region initialization in:
- **Status and Logs Section** - Real-time progress updates
- **Amazon CloudWatch** - Detailed Lambda execution logs

### Region Information Dashboard

Once setup completes, you'll see comprehensive region information:

#### 💾 SPICE Capacity
- **Free Capacity** - Available SPICE for new DataSets
- **Used Capacity** - Currently consumed SPICE
- **Importance**: RLS DataSets are created in SPICE mode

#### 📊 DataSet Summary
- **Manageable DataSets** - Can be managed via RLS Manager
  - DataSets created through QuickSight UI with standard sources
  - DataSets created via API
- **Un-Manageable DataSets** - Cannot be managed via API
  - DataSets created by directly uploading files to QuickSight
- **RLS Manager DataSets** - RLS DataSets created by this tool
  - Tagged with `RLS-Manager: True`

#### 🏗️ Regional Resources
- **S3 Bucket Name** - Where CSV files are stored
- **Glue Database Name** - Metadata catalog identifier
- **QuickSight DataSource Name** - Connection identifier

![Guide-Initialization.png](/Guide/images/Guide-InitializationActiveRegions.png)

### Managing Multiple Regions

You can:
- **Add regions** at any time
- **Remove regions**

### Troubleshooting

**Error: "Failed to create S3 bucket"**
- Check IAM permissions for S3 bucket creation
- Verify no naming conflicts exist
- Ensure region supports S3

**Error: "Cannot create Glue database"**
- Verify IAM permissions for Glue
- Check for existing database with same name
- Ensure Glue is available in the region

**Error: "QuickSight DataSource creation failed"**
- Confirm QuickSight is enabled in the region
- Verify Athena is available
- Check QuickSight service role permissions

## Step 3: Configure QuickSight Permissions

**Critical Step**: QuickSight must have permission to read RLS CSV files from the S3 buckets created by the RLS Manager.

### Why This is Required

- QuickSight uses a service role to access AWS resources
- RLS DataSets need to read CSV files from S3
- Without these permissions, RLS publishing will fail
- Must be configured for each region's S3 bucket

### Configuration Methods

Choose the method that matches your QuickSight setup:

- 🔵 [**QuickSight-Managed Role**](#quicksight-managed-role) (Default, Recommended)
- 🟠 [**Custom IAM Role**](#iam-custom-role) (Advanced)

---

### QuickSight-Managed Role

This is the default configuration for most QuickSight accounts.

#### Step-by-Step Instructions

1. **Access QuickSight Console**
   - Sign in with your QuickSight Admin account
   - Navigate to **Manage QuickSight** (top-right menu)
   - Under **Permissions** section, click on **AWS resources**
   - Click **Security & permissions** in the left menu
   - Click **Manage** button

![Guide-Initialization.png](/Guide/images/Initialize/Guide-InitializationQSPermissions-1.png)


3. **Configure S3 Access**
   - Click **Amazon S3**
   - Click **Select S3 Buckets**

![Guide-Initialization.png](/Guide/images/Initialize/Guide-InitializationQSPermissions-2.png)

4. **Select RLS Manager Buckets**
   - Find all buckets named `qs-managed-rls-[UUID]`
   - Check the box for each bucket
   - Remember: You'll have one bucket per managed region
   - Click **Finish**, then click on **Save**

![Guide-Initialization.png](/Guide/images/Initialize/Guide-InitializationQSPermissions-3.png)

#### What Gets Configured

QuickSight gains these permissions on selected buckets:
- ✅ List bucket contents
- ✅ Read objects (CSV files)
- ✅ Read object versions (for rollback)

---

### IAM Custom Role

If you're using a custom IAM role for QuickSight (advanced setup), follow these steps.

#### When to Use This Method

- You've configured a custom IAM role for QuickSight
- Your organization requires custom IAM policies
- You need fine-grained permission control

#### Step-by-Step Instructions

1. **Identify Your QuickSight IAM Role**
   - Go to **Manage QuickSight > Security & permissions**
   - Note the IAM role name under "IAM role"

2. **Open IAM Console**
   - Navigate to **Identity and Access Management (IAM)**
   - Click **Roles** in the left menu
   - Search for your QuickSight role

3. **Add Inline Policy**
   - Click **Add permissions > Create inline policy**
   - Switch to **JSON** tab
   - Paste the policy below (update UUIDs)

#### Required IAM Policy

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "ListAllBuckets",
            "Effect": "Allow",
            "Action": "s3:ListAllMyBuckets",
            "Resource": "arn:aws:s3:::*"
        },
        {
            "Sid": "ListRLSBuckets",
            "Action": [
                "s3:ListBucket"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::qs-managed-rls-[UUID-1]",
                "arn:aws:s3:::qs-managed-rls-[UUID-2]"
            ]
        },
        {
            "Sid": "ReadRLSObjects",
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::qs-managed-rls-[UUID-1]/*",
                "arn:aws:s3:::qs-managed-rls-[UUID-2]/*"
            ]
        }
    ]
}
```

#### Important Notes

- **Replace `[UUID-1]`, `[UUID-2]`** with actual bucket names from Step 2
- **Note the `/*` suffix** in the Resource ARNs for GetObject actions
- **Add one entry per region** you've configured
- **Policy name suggestion**: `QuickSight-RLS-Manager-S3-Access`

#### Finding Your Bucket Names

Bucket names are displayed in the RLS Manager UI after region setup:
- Format: `qs-managed-rls-[UUID]`
- One bucket per managed region
- UUIDs are randomly generated during setup

4. **Review and Create**
   - Click **Review policy**
   - Name it: `QuickSight-RLS-Manager-S3-Access`
   - Click **Create policy**

5. **Verify Permissions**
   - Policy should appear in the role's permissions list
   - Changes take effect immediately

---

## Verification and Next Steps

### Verify Initialization Success

After completing all three steps, verify:

- **Management Region** - Configured and showing account info
- **Managed Regions** - All desired regions added with resources created
- **S3 Permissions** - QuickSight can access all RLS Manager buckets
- **DataSets Visible** - Manageable DataSets appear in the UI

### Test the Setup

1. **Navigate to Manage Permissions** section
2. **Select a DataSet** from the list
3. **Create a test permission** for a user or group
4. **Publish** and monitor the workflow
5. **Verify** RLS is applied in QuickSight

### Common Post-Initialization Issues

**No DataSets Appearing**
- Ensure DataSets exist in the managed regions
- Check that DataSets are "manageable" (not file uploads)
- Verify QuickSight API access

**Publishing Fails at Step 1 (S3)**
- Confirm S3 permissions are correctly configured
- Check bucket names match in IAM policy
- Verify no bucket policies blocking access

**Publishing Fails at Step 3 (RLS DataSet)**
- Ensure SPICE capacity is available
- Verify QuickSight can access the Athena DataSource
- Check Glue table was created successfully

### What's Next?

Now that initialization is complete, you're ready to:

1. 📖 [**Manage Permissions**](Manage-Permissions.md) - Create and publish RLS rules
2. 🔍 [**Explore Features**](TheGuide.md#key-features) - Learn about advanced capabilities
3. 📊 [**Monitor SPICE**](TheGuide.md#troubleshooting) - Track capacity and performance
4. 🏗️ [**Understand Architecture**](Amplify-Resources.md) - Deep dive into the system

---

## Additional Resources

- [Installation Guide](Install.md) - How to install the RLS Manager
- [Managing Permissions](Manage-Permissions.md) - Complete permission management guide
- [Troubleshooting](TheGuide.md#troubleshooting) - Common issues and solutions
- [Architecture Details](Amplify-Resources.md) - Technical deep dive

**Need Help?** Check the [FAQ section](TheGuide.md#frequently-asked-questions) or review CloudWatch logs for detailed error messages.