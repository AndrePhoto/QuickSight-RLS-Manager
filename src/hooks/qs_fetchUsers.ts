import { generateClient } from "aws-amplify/data";
import { Schema } from "../../amplify/data/resource";

interface UserManagerProps {
  qsManagementRegion: string;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
  isFirstInit?: boolean;
  namespacesList?: string[];
}

interface UserManagerResult {
  status: number;
  message: string;
}

type UserGroupType = "User" | "Group";

const client = generateClient<Schema>();

export const qs_fetchUsers = async ({
  qsManagementRegion,
  addLog,
  isFirstInit = false,
  namespacesList = []
}: UserManagerProps): Promise<UserManagerResult> => {

  try {
    let nextToken = undefined
    let apiCallsCount = 1
    let usersCount = 0

    // If it's not the first initialization, retrieve all the users to check if someone has to be deleted.
    let usersToDelete: string[] = [];

    addLog("===================================================================")
    addLog("Starting Users Initialization")

    /**
     * List Users from RLS Tool, so that already are saved in DynamoDB 
     */
    if( ! isFirstInit ){
      // Fetching Users List from models
      const {data: resUsersList, errors} = await client.models.UserGroup.list({ 
        selectionSet: ['userGroupArn'],
        filter: { userGroup: { eq: "User" } }
      })

      if( errors ){
        const errorMessage = "Failed to fetch Users from RLS Tool Data. " + JSON.stringify(errors, null, 2)
        addLog(errorMessage, "ERROR", 500, "GraphQL-ListQueryFailed")
        return { status: 500, message: errorMessage }
      }else if( resUsersList != null){
        if(resUsersList.length == 0){
          addLog("No User found in RLS Tool Data.")
        }else{
          addLog("Users already saved in RLS Tool Data: " + resUsersList.length.toString())
          for (const user of resUsersList) {
            usersToDelete.push(user.userGroupArn)
          }
        }
      }
    } // END: List Users from RLS Tool

    /**
     * List Users from QuickSight - DO-WHILE with NextToken - FOR EACH NAMESPACE
     */

    for( const namespace of namespacesList ){
      if( namespace === undefined || namespace === "" || namespace === null ){
        addLog("Namespace is undefined. Skipping.", "WARNING")
        continue
      }
      addLog("Fetching Users for namespace: " + namespace)

      do {
        addLog("Calling QuickSight API ListUsersCommand, iteration: " + apiCallsCount.toString())
        const resQsUsersList = await client.queries.fetchUsersFromQS({
          qsManagementRegion: qsManagementRegion,
          namespace: namespace,
          nextToken: nextToken
        })

        if( resQsUsersList && resQsUsersList.data?.usersList && resQsUsersList.data.statusCode == 200 ){
          addLog("Saving the retrieved Users in the QuickSight RLS Tool.")
          const usersList = JSON.parse(resQsUsersList.data.usersList)
  
          for( const user of usersList ){
  
            const userParams = {
              userGroup: "User" as UserGroupType,
              name: user.UserName,
              userGroupArn: user.Arn,
              namespaceName: namespace,
              email: user.Email,
              role: user.Role,
              principalId: user.PrincipalId,
              description: user.Description,
              identityType: user.IdentityType
            }

            // If the group exists in the list to delete, remove it from the delete list and update it.
            if (usersToDelete.includes(user.Arn)){
              addLog(`User "${user.UserName}" already exists. Skipping creation.`)
              usersToDelete = usersToDelete.filter((arn) => arn !== user.Arn)
              const resUpdateGroup = await client.models.UserGroup.update( userParams )
              if( resUpdateGroup.data?.name == user.UserName ){
                usersCount += 1
                addLog(`User "${user.UserName}" already exists. Successfully updated.`)
              }else{
                addLog(`User "${user.UserName}" failed to update.`, "ERROR", 500, "GraphQL-UpdateQueryFailed")
                continue
              }
            } else {
              // If the group does not exists, create it. 
              addLog(`User "${user.UserName}" does not exists in RLS Tool. Proceeding to save it.`)
              const resCreateGroup = await client.models.UserGroup.create( userParams )

              if( resCreateGroup.data?.name == user.UserName ){
                usersCount += 1
                addLog(`User "${user.UserName}" successfully saved.`)
              }else{
                addLog(`User "${user.UserName}" failed to save.`, "ERROR", 500, "GraphQL-CreateQueryFailed")
                continue
              }
            }
          
          } // FOR LOOP

          // Check if there is Pagination
          nextToken = resQsUsersList.data.nextToken
          if( nextToken ){
            apiCallsCount++
            addLog("QuickSight API ListUsersCommand, nextToken found: " + nextToken)
          } else { 
            addLog("QuickSight API ListUsersCommand, no nextToken found. ")
          }

        } else {
          const errorMessage = "Error fetching UsersList from QuickSight API. " + JSON.stringify(resQsUsersList.errors, null, 2)
          addLog(errorMessage, "ERROR", 500, "ListUsersCommandError")
          addLog(resQsUsersList.data?.message || "Generic Error", "ERROR", 500, resQsUsersList.data?.errorName || "Generic Error")
          throw new Error(errorMessage);
        }
  
      }while(nextToken) // End Do-While with NextToken
    }

    /**
     * Check Results UsersList - Update Account Details
     */
    // If no Group is found, stop the initialization here since the rest of the function will fail.
    if( usersCount == 0){
      addLog("No QuickSight Users found. Check that you have Users in QuickSight", "WARNING");
      return { status: 500, message: "No QuickSight Users found. Check that you have Users in QuickSight" }
    } else {
      addLog(`QuickSight Users successfully fetched. Users found: ${usersCount.toString()}`)

      addLog("Update Account Details with Users Counter")

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
        usersCount: usersCount,
        groupsCount: resAccountDetails[0].groupsCount,
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
     * Delete users no more exising in QuickSight (if any)
     */
    // If there are user to delete, delete them. => Users that have been removed from QuickSight must be removed also from the tool
    if( usersToDelete.length > 0){
      addLog(`Deleting ${usersToDelete.length} users that are not in QuickSight anymore.`)
      for( const userArn of usersToDelete ){
        const {data: resDeleteGroup, errors: errorsDeleteGroup} = await client.models.UserGroup.delete({userGroupArn: userArn})

        if( errorsDeleteGroup ){
          const errorMessage = `Failed to delete Group "${userArn}". ` + JSON.stringify(errorsDeleteGroup, null, 2)
          addLog(errorMessage, "ERROR", 500, "GraphQL-DeleteQueryFailed")
          return { status: 500, message: errorMessage }
        }else if( resDeleteGroup?.userGroupArn == userArn ){
          addLog(`User "${userArn}" successfully deleted.`)
        }
      }
    } else {
      addLog("No User to delete.")
    }

    return { status: 200, message: "Users successfully fetched."}

  }catch(err){

    return({ status: 500, message: (err as Error).message })

  }
}