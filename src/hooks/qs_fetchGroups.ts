import { generateClient } from "aws-amplify/data";
import { Schema } from "../../amplify/data/resource";

interface GroupManagerProps {
  qsManagementRegion: string;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
  isFirstInit?: boolean;
  namespacesList?: string[];
}

interface GroupManagerResult {
  status: number;
  message: string;
}

type UserGroupType = "User" | "Group";

const client = generateClient<Schema>();

export const qs_fetchGroups = async ({
  qsManagementRegion,
  addLog,
  isFirstInit = false,
  namespacesList = []
}: GroupManagerProps): Promise<GroupManagerResult> => {

  try {
    let nextToken = undefined
    let apiCallsCount = 1
    let groupsCount = 0

    // If it's not the first initialization, retrieve all the groups to check if someone has to be deleted.
    let groupsToDelete: string[] = [];

    addLog("===================================================================")
    addLog("Starting Groups Initialization")

    /**
     * List Groups from RLS Tool, so that already are saved in DynamoDB 
     */
    if( ! isFirstInit ){
      // Fetching Groups List from models
      const {data: resGroupsList, errors} = await client.models.UserGroup.list({ 
        selectionSet: ['userGroupArn'],
        filter: { userGroup: { eq: "Group" } }
      })

      if( errors ){
        const errorMessage = "Failed to fetch Groups from RLS Tool Data. " + JSON.stringify(errors, null, 2)
        addLog(errorMessage, "ERROR", 500, "GraphQL-ListQueryFailed")
        return { status: 500, message: errorMessage }
      }else if( resGroupsList != null){
        if(resGroupsList.length == 0){
          addLog("No Group found in RLS Tool Data.")
        }else{
          addLog("Groups already saved in RLS Tool Data: " + resGroupsList.length.toString())
          for (const group of resGroupsList) {
            groupsToDelete.push(group.userGroupArn)
          }
        }
      }
    } // END: List Groups from RLS Tool

    /**
     * List Groups from QuickSight - DO-WHILE with NextToken - FOR EACH NAMESPACE
     */

    for( const namespace of namespacesList ){
      if( namespace === undefined || namespace === "" || namespace === null ){
        addLog("Namespace is undefined. Skipping.", "WARNING")
        continue
      }
      addLog("Fetching Groups for namespace: " + namespace)

      do {
        addLog("Calling QuickSight API ListGroupsCommand, iteration: " + apiCallsCount.toString())
        const resQsGroupsList = await client.queries.fetchGroupsFromQS({
          qsManagementRegion: qsManagementRegion,
          namespace: namespace,
          nextToken: nextToken
        })

        if( resQsGroupsList && resQsGroupsList.data?.groupsList && resQsGroupsList.data.statusCode == 200 ){
          addLog("Saving the retrieved Groups in the QuickSight RLS Tool.")
          const groupsList = JSON.parse(resQsGroupsList.data.groupsList)
  
          for( const group of groupsList ){
  
            const groupParams = {
              userGroup: "Group" as UserGroupType,
              name: group.GroupName,
              userGroupArn: group.Arn,
              namespaceName: namespace,
              email: "-",
              role: "-",
              principalId: group.PrincipalId,
              description: group.Description
            }

            // If the group exists in the list to delete, remove it from the delete list and update it.
            if (groupsToDelete.includes(group.Arn)){
              addLog(`Group "${group.GroupName}" already exists. Skipping creation.`)
              groupsToDelete = groupsToDelete.filter((arn) => arn !== group.Arn)
              const resUpdateGroup = await client.models.UserGroup.update( groupParams )
              if( resUpdateGroup.data?.name == group.GroupName ){
                groupsCount += 1
                addLog(`Group "${group.GroupName}" already exists. Successfully updated.`)
              }else{
                addLog(`Group "${group.GroupName}" failed to update.`, "ERROR", 500, "GraphQL-UpdateQueryFailed")
                continue
              }
            } else {
              // If the group does not exists, create it. 
              addLog(`Group "${group.GroupName}" does not exists in RLS Tool. Proceeding to save it.`)
              const resCreateGroup = await client.models.UserGroup.create( groupParams )

              if( resCreateGroup.data?.name == group.GroupName ){
                groupsCount += 1
                addLog(`Group "${group.GroupName}" successfully saved.`)
              }else{
                addLog(`Group "${group.GroupName}" failed to save.`, "ERROR", 500, "GraphQL-CreateQueryFailed")
                continue
              }
            }
          
          } // FOR LOOP

          // Check if there is Pagination
          nextToken = resQsGroupsList.data.nextToken
          if( nextToken ){
            apiCallsCount++
            addLog("QuickSight API ListGroupsCommand, nextToken found: " + nextToken)
          } else { 
            addLog("QuickSight API ListGroupsCommand, no nextToken found. ")
          }

        } else {
          const errorMessage = "Error fetching GroupsList from QuickSight API. " + JSON.stringify(resQsGroupsList.errors, null, 2)
          addLog(errorMessage, "ERROR", 500, "ListGroupsCommandError")
          addLog(resQsGroupsList.data?.message || "Generic Error", "ERROR", 500, resQsGroupsList.data?.errorName || "Generic Error")
          throw new Error(errorMessage);
        }
  
      }while(nextToken) // End Do-While with NextToken
    }

    /**
     * Check Results GroupsList - Update Account Details
     */
    // If no Group is found, stop the initialization here since the rest of the function will fail.
    if( groupsCount == 0){
      addLog("No QuickSight Groups found. Check that you have Groups in QuickSight", "WARNING");
      return { status: 500, message: "No QuickSight Groups found. Check that you have Groups in QuickSight" }
    } else {
      addLog(`QuickSight Groups successfully fetched. Groups found: ${groupsCount.toString()}`)

      addLog("Update Account Details with Groups Counter")

      const {data: resAccountDetails, errors: errorsAccountDetails} = await client.models.AccountDetails.list()
      if( errorsAccountDetails || resAccountDetails[0].accountId == null || resAccountDetails[0].accountId == undefined){
        const errorMessage = "Failed to fetch Account Details. " + JSON.stringify(errorsAccountDetails, null, 2)
        addLog(errorMessage, "ERROR", 500, "GraphQL-ListQueryFailed")
        return { status: 500, message: errorMessage }
      }

      const accountParams = {
        accountId: resAccountDetails[0].accountId,
        qsManagementRegion: qsManagementRegion,
        namespacesCount: resAccountDetails[0].namespacesCount,
        groupsCount: groupsCount,
        usersCount: 0,
      }

      const {data: resUpdateAccount, errors: errorsUpdateAccount} = await client.models.AccountDetails.update( accountParams )
      if( errorsUpdateAccount ){
        const errorMessage = "Failed to update Account Details. " + JSON.stringify(errorsUpdateAccount, null, 2)
        addLog(errorMessage, "ERROR", 500, "GraphQL-UpdateQueryFailed")
        return { status: 500, message: errorMessage }
      }else if( resUpdateAccount ){
        addLog("Account Details successfully updated.")
      }
    }

    /**
     * Delete groups no more exising in QuickSight (if any)
     */
    // If there are group to delete, delete them. => Groups that have been removed from QuickSight must be removed also from the tool
    if( groupsToDelete.length > 0){
      addLog(`Deleting ${groupsToDelete.length} groups that are not in QuickSight anymore.`)
      for( const groupArn of groupsToDelete ){
        const {data: resDeleteGroup, errors: errorsDeleteGroup} = await client.models.UserGroup.delete({userGroupArn: groupArn})

        if( errorsDeleteGroup ){
          const errorMessage = `Failed to delete Group "${groupArn}". ` + JSON.stringify(errorsDeleteGroup, null, 2)
          addLog(errorMessage, "ERROR", 500, "GraphQL-DeleteQueryFailed")
          return { status: 500, message: errorMessage }
        }else if( resDeleteGroup?.userGroupArn == groupArn ){
          addLog(`Group "${groupArn}" successfully deleted.`)
        }
      }
    } else {
      addLog("No Group to delete.")
    }

    return { status: 200, message: "Groups successfully fetched."}

  }catch(err){

    return({ status: 500, message: (err as Error).message })

  }
}