# RLS Manager: Installation Guide

This guide walks you through installing the QuickSight RLS Manager using AWS Amplify. The entire process takes approximately 15-20 minutes.

## Overview

The RLS Manager is deployed using [AWS Amplify](https://docs.amplify.aws/), which automatically provisions and configures all required AWS resources.

### What You'll Deploy

- 🌐 **Web Application** - React-based UI hosted on Amplify
- 🔐 **Authentication** - Amazon Cognito user pool
- 📊 **Database** - DynamoDB tables for configuration and permissions
- ⚡ **Functions** - 27 Lambda functions for automation
- 🔗 **API** - GraphQL API for data management
- 📝 **Logging** - CloudWatch logs and metrics

### Prerequisites

Before you begin, ensure you have:

- ✅ **AWS Account** with QuickSight enabled
- ✅ **QuickSight Enterprise Edition** (required for RLS)
- ✅ **GitHub Account** for forking the repository
- ✅ **Admin Access** to AWS Console
- ✅ **IAM Permissions** to create Amplify apps and resources

**Time Required**: 15-20 minutes

**Cost**: See [AWS Amplify Pricing](https://aws.amazon.com/amplify/pricing/) and [QuickSight Pricing](https://aws.amazon.com/quicksight/pricing/)

---

> ⚠️ **IMPORTANT: Initialization Required**
> 
> After completing the installation, you **MUST** perform the [RLS Manager Initialization](Initialization.md) to configure your QuickSight regions and set up the necessary resources. The application will not function properly without initialization.
> 
> **Next Step After Installation**: [→ Go to Initialization Guide](Initialization.md)

---

## Installation Steps

1. 🍴 [**Fork the Repository**](#step-1-fork-the-repository)
2. 🚀 [**Create the Amplify App**](#step-2-create-the-amplify-app)
3. ⚙️ [**Configure the Amplify App**](#step-3-configure-the-amplify-app)
4. ✅ [**Verify Installation**](#step-4-verify-installation)

## Step 1: Fork the Repository

First, create your own copy of the RLS Manager repository.

### Why Fork?

- Allows you to customize the solution
- Enables you to pull updates from the main repository
- Gives you full control over deployments
- Required for Amplify GitHub integration

### Instructions

1. **Navigate to GitHub Repository**
   - Go to [QuickSight-RLS-Manager repo](https://github.com/AndrePhoto/QuickSight-RLS-Manager)

2. **Fork the Repository**
   - Click the **Fork** button (top-right corner)
   - Select copy only master branch
   - Select your GitHub account as the destination
   - Wait for the fork to complete

3. **Verify Fork**
   - You should now see the repository in your GitHub account
   - URL format: `https://github.com/YOUR-USERNAME/QuickSight-RLS-Manager`

---

## Step 2: Create the Amplify App

Deploy the RLS Manager to your AWS account using AWS Amplify.

### Deployment Instructions

**Note**: You can deploy the Amplify app in any AWS region. The QuickSight Management Region will be configured later during the [Initialization](Initialization.md) phase.

#### 1. Open AWS Amplify

- Sign in to the **AWS Console**
- Navigate to **AWS Amplify** service

#### 2. Create New App

- Click **Deploy an App**

![Deploy App in Amplify](/Guide/images/Install/Guide-Install-01.png)

#### 3. Connect to GitHub

- Select **GitHub** as the *Git provider*
- Click **Next**

![Select Git Provider](/Guide/images/Install/Guide-Install-02.png)

**If your GitHub is not already connected to AWS Account, proceed with these steps. Otherwise you can jump to [Select Repository and Branch](#4-select-repository-and-branch)**

- Add your **GitHub Credentials** 

![LogIn GitHub](/Guide/images/Install/Guide-Install-03.png)

- **Authorize AWS Amplify** to access your GitHub account
  - Click **Authorize AWS Amplify**

![Authorize GitHub - Step1](/Guide/images/Install/Guide-Install-04.png)

- If it's the first time connecting **GitHub** to **AWS Account**, you can directly decide if you want to authorize All Repositories, or just the ones you need.

![Authorize GitHub - Step2](/Guide/images/Install/Guide-Install-05.png)


#### 4. Select Repository and Branch

- **Repository**: Select `[YOUR-USERNAME]/QuickSight-RLS-Manager` (your fork)
- **Branch**: `master`
- Click **Next**

**Note**: If you don't see your repository, you can click on **Update GitHub permissions**

![Select Repo and Branch](/Guide/images/Install/Guide-Install-06.png)

#### 5. Configure Build Settings

- **App name**: Leave as default
- **Build settings**: Leave as auto-detected

![App Settings](/Guide/images/Install/Guide-Install-07.png)

**(Optional) Security Enhancement**:
- Enable **Password protect my site** for an additional security layer
- Useful for restricting access during initial setup
- Can be disabled later

![Password Protect](/Guide/images/Install/Guide-Install-08.png)

#### 6. Review and Deploy

- Review all settings
- Click **Save and deploy**

![Save and Deploy](/Guide/images/Install/Guide-Install-09.png)

**Now we just wait for the app to be deployed!**

![Launch in progress](/Guide/images/Install/Guide-Install-10.png)

### Deployment Process

The deployment takes **10-15 minutes** and includes these phases:

1. **Provision** - Create Amplify hosting environment
2. **Build** - Compile React application
3. **Deploy** - Upload to Amplify hosting
4. **Verify** - Run health checks

### Resources Created

During deployment, AWS Amplify automatically creates:

#### Core Infrastructure
- 📊 **DynamoDB Tables** - 5 tables for data storage ([details](Amplify-DynamoDb.md))
- ⚡ **Lambda Functions** - 27 functions for automation ([details](Amplify-Lambdas.md))
- 🔗 **AppSync API** - GraphQL API for data access
- 🔐 **Cognito User Pool** - Authentication and user management
- 📝 **CloudWatch Logs** - Logging and monitoring
- 🔑 **IAM Roles** - Service permissions and policies

#### Monitoring Deployment

You can monitor the deployment in two places:

1. **Amplify Console** - Real-time build progress
2. **CloudFormation Console** - Detailed resource creation
   - Navigate to [CloudFormation](https://console.aws.amazon.com/cloudformation/)
   - Look for stacks starting with `amplify-`

### Deployment Complete

Once deployment finishes:

✅ **Status**: All phases show green checkmarks
✅ **URL**: Deployment URL is displayed
✅ **Resources**: All AWS resources are created

**Access Your App**:
- Click **Visit deployed URL** in the Amplify console
- Or copy the URL (format: `https://main.xxxxx.amplifyapp.com`)

### Troubleshooting Deployment

**Build Failed**
- Check build logs in Amplify console
- Verify GitHub repository is accessible
- Ensure branch name is correct

**Deploy Failed**
- Check IAM permissions for Amplify
- Verify no resource limits are reached
- Review CloudFormation stack events

**Resources Not Created**
- Check CloudFormation console for errors
- Verify account limits (Lambda, DynamoDB)
- Ensure region supports all required services

---

## Step 3: Configure the Amplify App

After deployment, configure user access and optional security features.

### User Management

The RLS Manager uses Amazon Cognito for authentication. Self-registration is disabled for security.

#### Adding Users

1. **Open Your Amplify App**
   - Navigate to AWS Amplify console
   - Click on your app name
   - Select the deployed branch (usually `main`)

![Open Amplify](/Guide/images/Install/Guide-Install-11.png)

2. **Access User Management**
   - Click **Backend environments** tab
   - Click **Authentication** or **User management**
   - This opens the Cognito User Pool

![Open Amplify](/Guide/images/Install/Guide-Install-12.png)

3. **Create Users**
   - Click **Create user**
   - Enter user details:
     - **Username**: Email address (recommended)
     - **Email**: User's email
     - **Temporary password**: Initial password
   - Check **Send invitation** to email the user
   - Click **Create user**

4. **User First Login**
   - Users receive an email with temporary password
   - On first login, they must change their password
   - New password must meet complexity requirements

#### User Management Best Practices

- ✅ Use email addresses as usernames for clarity
- ✅ Regularly review and remove inactive users
- ❌ Don't share user credentials
- ❌ Don't use generic accounts (e.g., admin@company.com)

### Optional: Enable IP Protection

Add an additional security layer by restricting access based on IP address or country.

#### When to Use

- Restrict access to corporate networks only
- Comply with geographic data residency requirements
- Add defense-in-depth security
- Prevent unauthorized access attempts

#### Configuration Steps

1. **Open Firewall Settings**
   - In Amplify console, click on your **App** (not branch)
   - Navigate to **Hosting > Firewall**

![Open Amplify](/Guide/images/Install/Guide-Install-13.png)

2. **Configure Rules**
   - **IP-based rules**: Allow/deny specific IP addresses or CIDR ranges
   - **Country-based rules**: Allow/deny specific countries
   - **Rate limiting**: Prevent brute force attacks

3. **Example Configurations**

**Allow Corporate Network Only**:
```
Rule: Allow
Type: IP address
Value: 203.0.113.0/24
```

**Block Specific Countries**:
```
Rule: Deny
Type: Country
Value: Select countries to block
```

4. **Save and Test**
   - Rules take effect immediately
   - Test access from allowed/blocked locations
   - Monitor CloudWatch logs for blocked requests

### Optional: Custom Domain

Use your own domain name instead of the default Amplify URL.

#### Benefits

- Professional, branded URL
- Free HTTPS certificate
- Easier to remember and share
- Better for bookmarking

#### Configuration Steps

1. **Open Domain Settings**
   - In Amplify console, click on your **App**
   - Navigate to **Hosting > Custom domains**

![Open Amplify](/Guide/images/Install/Guide-Install-14.png)

2. **Add Domain**
   - Click **Add domain**
   - Enter your domain name (e.g., `rls-manager.example.com`)

3. **Domain Options**

**Option A: Route 53 Domain** (Recommended)
- If your domain is registered in Route 53
- Amplify automatically configures DNS
- One-click setup

**Option B: Third-Party Domain**
- If your domain is registered elsewhere (GoDaddy, Namecheap, etc.)
- Amplify provides DNS records
- You manually add records to your DNS provider

4. **SSL Certificate**
   - Amplify automatically provisions an SSL certificate
   - Uses AWS Certificate Manager (ACM)
   - Free and auto-renewing

5. **Verification**
   - DNS propagation takes 5-60 minutes
   - Amplify shows verification status
   - Once verified, your custom domain is live

### Additional Configuration Options

#### Notifications

Set up deployment notifications:
- Navigate to **App settings > Notifications**
- Configure email or SNS notifications
- Get alerts for build success/failure

---

## Step 4: Verify Installation

Confirm that the RLS Manager is properly installed and ready to use.

### Access the Application

1. **Open the RLS Manager**
   - Click **Visit deployed URL** in Amplify console
   - Or navigate to your custom domain (if configured)

2. **Login**
   - Enter username (email) and password
   - Change temporary password on first login
   - You should see the RLS Manager dashboard

### Verify AWS Resources

Check that all resources were created successfully:

#### DynamoDB Tables

Navigate to DynamoDB console and verify these tables exist:
- ✅ `Account-[env]` - Account configuration
- ✅ `DataSet-[env]` - DataSet metadata
- ✅ `Permission-[env]` - RLS permissions
- ✅ `Region-[env]` - Regional configuration
- ✅ `Version-[env]` - Version history

#### Lambda Functions

Navigate to Lambda console and verify functions exist:
- ✅ 27 Lambda functions with names starting with `amplify-`
- ✅ All functions have IAM roles attached
- ✅ CloudWatch log groups created

#### AppSync API

Navigate to AppSync console:
- ✅ GraphQL API exists
- ✅ Schema is deployed
- ✅ Data sources connected

#### Cognito User Pool

Navigate to Cognito console:
- ✅ User pool exists
- ✅ Users are created
- ✅ App client configured

### Test Basic Functionality

1. **Dashboard Loads**
   - Main dashboard displays without errors
   - Navigation menu is accessible

2. **No Initialization Yet**
   - You should see a prompt to initialize
   - This is expected - initialization is the next step

### Common Installation Issues

**Cannot Access Application**
- Verify deployment completed successfully
- Check Amplify hosting status
- Ensure no firewall rules blocking access
- Try incognito/private browsing mode

**Login Fails**
- Verify user was created in Cognito
- Check username format (usually email)
- Ensure password meets complexity requirements
- Try password reset if needed

**Resources Missing**
- Check CloudFormation stacks for errors
- Verify IAM permissions for Amplify
- Review CloudWatch logs for deployment errors
- Ensure account limits not exceeded

**Build Failed**
- Check build logs in Amplify console
- Verify GitHub repository access
- Ensure Node.js version compatibility
- Check for dependency issues

---

## Next Steps

Installation complete! Now proceed to:

1. 🎯 [**Initialization Guide**](Initialization.md) - Configure your first region
2. 📖 [**The Complete Guide**](TheGuide.md) - Learn about all features
3. 🔐 [**Managing Permissions**](Manage-Permissions.md) - Create your first RLS rules

### Post-Installation Checklist

Before moving to initialization:

- ✅ Application is accessible
- ✅ You can log in successfully
- ✅ All AWS resources are created
- ✅ Users are added to Cognito
- ✅ Optional security features configured (firewall, custom domain)

### Updating the Application

To update the RLS Manager in the future:

1. **Pull Updates** from the main repository to your fork
2. **Amplify Auto-Deploys** changes from your GitHub repository
3. **Monitor Deployment** in Amplify console
4. **Test Changes** after deployment completes

### Uninstalling

If you need to remove the RLS Manager:

1. **Delete Amplify App** - Removes hosting and most resources
2. **Delete CloudFormation Stacks** - Removes remaining resources
3. **Delete S3 Buckets** - Manually delete RLS CSV buckets (if created)
4. **Delete Cognito Users** - Automatically deleted with app

**Note**: RLS rules remain active in QuickSight even after uninstalling.

---

## Additional Resources

- [AWS Amplify Documentation](https://docs.amplify.aws/)
- [DynamoDB Tables Reference](Amplify-DynamoDb.md)
- [Lambda Functions Reference](Amplify-Lambdas.md)
- [Architecture Overview](Amplify-Resources.md)
- [Troubleshooting Guide](TheGuide.md#troubleshooting)

**Need Help?** Check the [FAQ section](TheGuide.md#frequently-asked-questions) or review CloudWatch logs for detailed error messages.

