# Row Level Security Manager: Launch the solution with Amplify
As said in the [README.md](../README.md), I have used Amplify to create this solution.

To create the App with Amplify, first of all you need to create a fork from the solution GitHub Repo.

#### In GitHub
* Go to GitHub [QuickSight-RLS-Manager repo](https://github.com/AndrePhoto/QuickSight-RLS-Manager)
* Fork the repo in your account

#### In your AWS Account
In the **AWS Account** where you have _QuickSight_, in the - that is also the _QuickSight Management Region_ (the one where you first created the QuickSight account):
* Open **AWS Amplify**
* Click on _Create New App_
* Select _Deploy your app > GitHub_ and then click on Next
  * Grant access to you GitHub repo (refresh the page if you do not see the repo once the permissions have been updated)
  * Select the main branch and click next
* Leave the _App Settings_ as default
  * You can add another layer of protection for the site activating the _Password protect my site_
* Click on _Next_, _Review_ all the details and click on _Save and deploy_.

This operation will take a few minutes. All these resources will be created for you in your account:

* [AWS DynamoDB Tables](/Guide/Amplify-DynamoDb.md)
* [AWS Lambdas](/Guide/Amplify-Lambdas.md) (with their specific permissions)
* ...

Yoou can see all the resources creation process in CloudFormation.

Once the deploy has finished, you can see your the QuickSight-RLS-Manager app by clicking on _Visit deployed URL_.