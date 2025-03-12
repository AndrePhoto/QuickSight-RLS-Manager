# QuickSight Row Level Security Manager

Many customers have highlighted the complexity of managing Row Level Security in QuickSight.
When using Anonymous Embedding, Row Level Security is managed via tags and it's easier to do. Also, the UI in QuickSight it's friendly and easily undestandable.

When there's the need to use User/Group based Row Level Security, at the moment the only way to create the RLS is to create a new DataSet. 
This DataSet must have a specific format (see [Documentation here](https://docs.aws.amazon.com/quicksight/latest/user/restrict-access-to-a-data-set-using-row-level-security.html)), and the quickest way to do it is to create a CSV file, updating the file manually and loading a new version of the DataSet each time you need to change the RLS.

Since the CSV has the format `GroupName,UserName,field1,field2,field3..`, the underlying structure may change over the time, making it also difficult to maintain in an external DB. E.g., if using a Relational DB, you need a `view` that changes each time the permissions field changes, and then you will need to update the dataset accordingly.

So, the idea behing this solution is to have a understandable UI for the *Administrator* to create and manage the *Permissions* of all the DataSets in QuickSight.
Using the RLS Manager, the user just need to create the desired Permission, and then all the underlying resources and changes are performed in an automated way.

The solution include the creation of some support resources, so I've developed everything using [AWS Amplify](https://docs.amplify.aws/react/), which make it easier to defined everything by code, from the AWS services resources to the UI itself.

## Core Concepts
In all the Guide and the Tool itself you will find mainly two main resources that are fundamental and that have not to be confused:
* DataSet to be Secured, or Main DataSet...: this is the DataSet that we want to protect with RLS
* RLS DataSet: this is the DataSet that contains the RLS information that we'll apply to the DataSet to be Secured.

## Architecture
Amplify will generate some resources for you. 
The solution uses these services:
* [Amazon Dynamo DB](https://aws.amazon.com/dynamodb/)
* [Amazon S3](https://aws.amazon.com/pm/serv-s3/)
* [AWS Glue](https://aws.amazon.com/glue/)
* [Amazon Athena](https://aws.amazon.com/athena/)
* [AWS Lambda](https://aws.amazon.com/lambda/?nc1=h_ls)

See the details in [RLS Manager Resources](Amplify-Resources.md).

## Known (actual) limitations
* The Solution lets you manage a single QuickSight Account

## Future Enhancements

# Guide

* [Install the RLS Manager](/Guide/Install.md)
* [RLS Manager Initialization](/Guide/Initialization.md)
* Create Permissions
* Code Dive Deep