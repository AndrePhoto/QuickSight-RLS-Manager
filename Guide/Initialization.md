# Row Level Security Manager: Initialization
When you first enter the **RLS Manager**, there is a first set-up to be done. 

1. [Set up QuickSight Management Region](#set-up-quicksight-management-region)
1. [Add QuickSight Regions](#add-quicksight-regions)
1. [QuickSight Permissions](#quicksight-permissions)

## Set up QuickSight Management Region
First of all you need to define the *QuickSight Management Region*, which is the AWS Region where you first created you QuickSight Account, the Region where the whole QuickSight management is done.

Once the Region has been selected, click on *Submit* and the **RLS Manager** launch `doAccountInit()` hook, that will: 
* Validate the access to the specified Region (be sure no SCP are blocking the APIs)
* Do the account initialization on DynamoDB
* Fetch the QuickSight NameSpaces
* Fetch the QuickSight Groups
* Fetch the QuickSight Users

:information_source: You can check the status of the Initialization in the *Status and Logs* section. More details (especially for the AWS Lambdas that are called) can be found in *Amazon CloudWatch*.

![Guide-Initialization.png](/Guide/images/Guide-Initialization.png)

Once the Initialization has finished successfully, you should see the info related to your QuickSight Account.

![Guide-Initialization.png](/Guide/images/Guide-InitializationSuccess.png)

## Add QuickSight Regions
Once the *QuickSight Management Region* has been defined, you can select which *AWS Regions* Row Level Security you want to manage with the **RLS Manager**.

In the *Active QuickSight Regions* select *Add Regions* and add the ones you want to manage. 
Note that, for each selected AWS Region, the **RLS Manager** will create (`regionSetup()`):
* an *Amazon S3* bucket where the CSV created by the Manager will be stored (name will be: `qs-managed-rls-[UUID]`)
* a *AWS Glue* Database, called `qs-managed-rls-[UUID]`, where the S3 data will be read and being available to be used in *Amazon Athena* and so in *Quicksight*
* a *Amazon QuickSight* DataSource, named `qs-managed-rls-[UUID]`.

When you launch a Region Initialization, you can check the logs in the `Status and Logs` section and in *Amazon CloudWatch*.

Once the Region set-up is complete, you can see these info:
* **SPICE** capacity free/used. This is useful because the **RLS Manager** can created RLS DataSets for you, and the DataSet will be created in SPICE.
* **DataSets**
  * *Manageable* - these are the DataSets that can be managed by the RLS Manager. Some types of DataSets cannot be managed through APIs at the moment (e.g. the DataSets with a source directly updloaded in QuickSight)
  * *Un-Manageable* - the number of DataSets that cannot be managed by APIs
  * *Created with RLS Manager* - these are the RLS DataSets created by the **RLS Manager**
* The name of the regional resources created for you
  * Amazon S3 Bucket
  * AWS Glue Database
  * Amazon QuickSight DataSource

![Guide-Initialization.png](/Guide/images/Guide-InitializationActiveRegions.png)

## QuickSight Permissions
This is a fundamental step.
To let QuickSight read data from the S3 Bucket, you need to grant the QuickSight Service Role the permissions to read from the S3 Bucket(s) created by the **RLS Manager**.

To do this, access QuickSight with the Admin account and go to *Manage QuickSight > Security & permissions*. Here click on *Manage*.

![Guide-Initialization.png](/Guide/images/Guide-InitializationQSPermissions-1.png)

Here you have two possibilities:
* [You are using the QuickSight-managed role (default)](#quicksight-managed-role)
* [You are using a custom IAM Role](#iam-custom-role)

### QuickSight-Managed role
If you have the default option selected, proceed here. Otherwise see the [IAM Custom Role](#iam-custom-role) section.
Click now on *Amazon S3 > Select S3 Buckets*.
![Guide-Initialization.png](/Guide/images/Guide-InitializationQSPermissions-2.png)

From there select all the S3 buckets that are relevant. Depending on the Regions you have activated, you may have to select more buckets.
![Guide-Initialization.png](/Guide/images/Guide-InitializationQSPermissions-3.png)

### IAM Custom Role
Select yor IAM Role in Identitiy and Access Management (IAM) service and add this policy:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": "s3:ListAllMyBuckets",
            "Resource": "arn:aws:s3:::*"
        },
        {
            "Action": [
                "s3:ListBucket"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::qs-managed-rls-[UUID-1]",
                "arn:aws:s3:::qs-managed-rls-[UUID-2]",
                "..."
            ]
        },
        {
            "Action": [
                "s3:GetObject",
                "s3:GetObjectVersion"
            ],
            "Effect": "Allow",
            "Resource": [
                "arn:aws:s3:::qs-managed-rls-[UUID-1]/*", // note the * here!
                "arn:aws:s3:::qs-managed-rls-[UUID-2]/*",
                "..."
            ]
        }
    ]
}
```