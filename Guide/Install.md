# Row Level Security Manager: Launch the solution with Amplify
As said in the [README.md](../README.md), I have used Amplify to create this solution.

* [Create the Amplify App](#create-the-amplify-app)
* [Configure the Amplify App](#configure-the-amplify-app)

## Create the Amplify App

To create the App with Amplify, first of all you need to create a fork from the solution GitHub Repo.

#### In GitHub
* Go to GitHub [QuickSight-RLS-Manager repo](https://github.com/AndrePhoto/QuickSight-RLS-Manager)
* Fork the repo in your account

#### In your AWS Account
In the **AWS Account** where you have _QuickSight_, in the - that is also the _QuickSight Management Region_ (the one where you first created the QuickSight account):
* Open **AWS Amplify**
* Click on _Create New App_
![Open Amplify](/Guide/images/Guide-Install-01.png)
* Select _Deploy your app > GitHub_ and then click on Next
  * Grant access to you GitHub repo (refresh the page if you do not see the repo once the permissions have been updated)
  * Select the main branch and click next
![Open Amplify](/Guide/images/Guide-Install-02.png)
![Open Amplify](/Guide/images/Guide-Install-03.png)
* Leave the _App Settings_ as default
  * You can add another layer of protection for the site activating the _Password protect my site_
![Open Amplify](/Guide/images/Guide-Install-04.png) 
![Open Amplify](/Guide/images/Guide-Install-05.png)
* Click on _Next_, _Review_ all the details and click on _Save and deploy_.
![Open Amplify](/Guide/images/Guide-Install-06.png)
![Open Amplify](/Guide/images/Guide-Install-07.png)

This operation will take a few minutes. All these resources will be created for you in your account:

* [AWS DynamoDB Tables](/Guide/Amplify-DynamoDb.md)
* [AWS Lambdas](/Guide/Amplify-Lambdas.md) (with their specific permissions)
* ...

You can see all the resources creation process in [_CloudFormation_](https://docs.aws.amazon.com/cloudformation/).

Once the deploy has finished, you can see your the QuickSight-RLS-Manager app by clicking on _Visit deployed URL_.

## Configure the Amplify App

There are some other configuration you can do on Amplify once the app is deployed.

### Users Management

_The self-sign-in is disabled._ 
You can manage the users directly in _Amplify_, the users are managed through an [_AWS Cognito_](https://docs.aws.amazon.com/cognito/latest/developerguide/getting-started-user-pools.html) pool.

Open the newly created App and select the branch (you should only have one, the master).
![Open Amplify](/Guide/images/Guide-Install-08.png)

Now open Authentication panel.
Add here every user you want to be able to access the RLS Manager.

![Open Amplify](/Guide/images/Guide-Install-09.png)

### Enable IP Protection
From the App level (not the Branch level) you can also add the Firewall protection, defining e.g. IP and country filtering for the access to the RLS Manager.

To manage the Firewall, in _Amplify_ click on the _App_, then on _Hosting > Firewall_.
![Open Amplify](/Guide/images/Guide-Install-10.png)

### Custom domains
Use your own custom domain with free HTTPS to provide a secure, friendly URL for your app. Register your domain on Amazon Route53 for a one-click setup, or connect any domain registered on a 3rd party provider.

To manage the custom domains, in _Amplify_ click on the _App_, then on _Hosting > Custom domains_.
![Open Amplify](/Guide/images/Guide-Install-11.png)