# Manage Permissions

The whole point of this solution is to let you easily manage the Row Level Security in a visual and easier way. So the whole core is in the _Manage Permissions_ page.

Since it's possible to manage the whole QuickSight account in all the Regions, the first thing to do is obiously select the Region and the DataSet you want to secure.

## Select a Region
Once you select a Region, you can see the _Region Details_.

:information_source: If you do not see a Region that you are using in QuickSight, please see the [RLS Tool Initialization](/Guide/Initialization.md) process, or navigate to the _Global Settings_ page.

![Manage Permissions](/Guide/images/ManagePermissions-01.png)

#### SPICE
This shows the capacity status of your SPICE subscription in the selected Region. Since the RLS DataSet will be created in SPICE, it's necessary to have free space to add / modify a new RLS DataSet.

#### DataSets
This info shows you how many DataSets have been retrieved for the specific Region.
* Manageable: these are DataSets that can be managed through the RLS Manager
* Un-Manageable: these DataSets cannot be managed through the RLS Manager since the QuickSight APIs are limited due to the specific DataSet type. E.g. the DataSets created directly uploading a file in QuickSight cannot be managed through the APIs.
* Created with RLS Tool: this number shows you how many RLS DataSets have been created with the RLS Manager.

#### Resources IDs
The following info line shows you the IDs of the Regional resources created for you when you enabled this Region in the RLS Manager.
This can be useful for debugging or manual data discovery.

:warning: any change performed manually on these resources can prevent the RLS Manager to work properly.

## Select a DataSet

Once you select a DataSet, you can see the _DataSet Details_.

:information_source: In the DataSet form select you will see only the DataSets that can be managed through the RLS Manager and that have not been created using the RLS Manager. To see the complete list of the DataSet in the selected Region, navigate to the _DataSets List_ page.
:information_source: If you do not see a DataSet that you have in QuickSight, please see the [RLS Tool Initialization](/Guide/Initialization.md) process, or navigate to the _Global Settings_ page.

![Manage Permissions](/Guide/images/ManagePermissions-02.png)

You will find here:
* Name
* ID
* ARN
* Import Mode (`SPICE` or `DIRECT_QUERY`)
* Created and Updated time
* RLS Enabled
  * DISABLED
  * ENABLED (Green): the RLS is enabled and managed by the RLS Manager
  * ENABLED (Orange): the RLS is enabled, but directly managed in QuickSight
* If the RLS is Enabled, you will also have the ID of the DataSet used for RLS.

## Permissions
Now in the Permissions container you can add, edit and delete the Permissions.

#### Add Permissions
By clicking on _Add Permission_ you can add a permission for a spefic Group or User. 

* Select if you want to add a permission for a User or a Group
* Select the User/Group from the list (:warning: if you do not see a User/Group, refresh the data from the _Global Settings_ page.)
* Now select the permission you want to grant
  * If you want that the User/Group selected can see ALL the data, you can toggle the _Sees All_ button.
  * If you want to filter for a specific field and value, select the Field from the list and add a value. The value field is a comma-separated list.
* Click on _Create Permissions_
![Manage Permissions](/Guide/images/ManagePermissions-03.png)

If you select a combination User/Group-Permission already existing, a warning will show up saying that you are now editing an existing permission.
![Manage Permissions](/Guide/images/ManagePermissions-04.png)
![Manage Permissions](/Guide/images/ManagePermissions-05.png)

Once you've added the permissions you want, you will see the full list of permissions in the table, grouped by Users/Groups.

You will notice a warning message stating that you've added or edited permissions, but the RLS is not already published in QuickSight. In-fact, the changes on the Permissions are initially performed only on the RLS Manager, but you need to manually launch the Sync.

This decision has two reasons:
* You will launch less APIs calls by publishing all the permissions changes in one shot
* If you create something wrong, you have time to check and revert the possible errors.

You can Edit (only the filter value) / Delete the permissions directly in-line in the table.

![Manage Permissions](/Guide/images/ManagePermissions-06.png)

### Download CSV Permissions File
If for some reason you want to download the CSV created for you, you have the possibility to enter the S3 bucket created for you in the specific Region or you can download the current permissions version directly in this page, opening the Export CSV container.
![Manage Permissions](/Guide/images/ManagePermissions-07.png)
