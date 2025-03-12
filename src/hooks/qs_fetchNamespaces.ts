import { generateClient } from "aws-amplify/data";
import { Schema } from "../../amplify/data/resource";

interface NamespaceManagerProps {
  qsManagementRegion: string;
  addLog: (log: string, type?: string, errorCode?: number, errorName?: string) => void;
  isFirstInit?: boolean;
}

interface NamespaceManagerResult {
  status: number;
  message: string;
  namespacesList: string[];
}

const client = generateClient<Schema>();

export const qs_fetchNamespaces = async ({
  qsManagementRegion,
  addLog,
  isFirstInit = false
}: NamespaceManagerProps): Promise<NamespaceManagerResult> => {

  try {
    let nextToken = undefined
    let apiCallsCount = 1
    let namespacesCount = 0
    let namespaceList: string[] = [];

    // If it's not the first initialization, retrieve all the namespaces to check if someone has to be deleted.
    let namespacesToDelete: string[] = [];
    let namespaceNameToDelete: string[] = []; // to check Users and Groups to be deleted

    addLog("===================================================================")
    addLog("Starting Namespaces Initialization")

    /**
     * List Namespaces from RLS Tool, so that already are saved in DynamoDB 
     */
    if( ! isFirstInit ){
      // Fetching Namespaces List from models
      const {data: resNamespaceList, errors} = await client.models.Namespace.list({selectionSet: ['namespaceArn', 'namespaceName']})

      if( errors ){
        const errorMessage = "Failed to fetch Namespaces from RLS Tool Data. " + JSON.stringify(errors, null, 2)
        addLog(errorMessage, "ERROR", 500, "GraphQL-ListQueryFailed")
        return { status: 500, message: errorMessage, namespacesList: [] }
      }else if( resNamespaceList != null){
        if(resNamespaceList.length == 0){
          addLog("No Namespaces found in RLS Tool Data.")
        }else{
          addLog("Namespaces already saved in RLS Tool Data: " + resNamespaceList.length.toString())
          for (const namespace of resNamespaceList) {
            namespacesToDelete.push(namespace.namespaceArn)
            namespaceNameToDelete.push(namespace.namespaceName)
          }
        }
      }
    } // END: List Namespaces from RLS Tool

    /**
     * List Namespaces from QuickSight - DO-WHILE with NextToken
     */
    do {
      addLog("Calling QuickSight API ListNamespacesCommand, iteration: " + apiCallsCount.toString())
      // Fetching Namespaces List directly from Quicksight
      const resQsNamespaceList = await client.queries.fetchNamespacesFromQS({
        qsManagementRegion: qsManagementRegion,
        nextToken: nextToken
      })

      if( resQsNamespaceList && resQsNamespaceList.data?.namespacesList && resQsNamespaceList.data.statusCode == 200 ){
        addLog("Saving the retrieved Namespaces in the QuickSight RLS Tool.")
        const namespacesList = JSON.parse(resQsNamespaceList.data.namespacesList)

        for( const namespace of namespacesList ){

          // If the namespace exists in the list to delete, remove it from the delete list and also do not create it again.
          if (namespacesToDelete.includes(namespace.arn)){
            addLog(`Namespace "${namespace.name}" already exists. Skipping creation.`)
            namespacesToDelete = namespacesToDelete.filter((arn) => arn !== namespace.arn)
            namespaceNameToDelete = namespaceNameToDelete.filter((name) => name !== namespace.name)
            namespacesCount += 1
            namespaceList.push(namespace.name)
            continue
          }

          // If the namespace does not exists, create it. Update is not necessary since the namespace cannot change its values.
          const resCreateNamespace = await client.models.Namespace.create({
            namespaceName: namespace.name,
            namespaceArn: namespace.arn,
            capacityRegion: namespace.capacityRegion,
          })
          if( resCreateNamespace.data?.namespaceName == namespace.name ){
            namespacesCount += 1
            namespaceList.push(namespace.name)
            addLog(`Namespace "${namespace.name}" successfully saved.`)
          }else{
            addLog(`Namespace "${namespace.name}" failed to save.`, "ERROR", 500, "GraphQL-CreateQueryFailed")
          }
        }

        // Check if there is Pagination
        nextToken = resQsNamespaceList.data.nextToken
        if( nextToken ){
          apiCallsCount++
          addLog("QuickSight API ListNamespacesCommand, nextToken found: ", nextToken)
        }else{
          addLog("QuickSight API ListNamespacesCommand, no nextToken found. ")
        }
      }else{
        const errorMessage = "Error fetching NamespacesList from QuickSight API. " + JSON.stringify(resQsNamespaceList.errors, null, 2)
        addLog(errorMessage, "ERROR", resQsNamespaceList.data?.statusCode, "ListNamespacesCommandError")
        addLog(resQsNamespaceList.data?.message || "Generic Error", "ERROR", 500, resQsNamespaceList.data?.errorName || "Generic Error")
        throw new Error(errorMessage);
      }

    }while(nextToken) // End Do-While with NextToken

    /**
     * Check Results NamespacesList - Update Account Details
     */
    // If no Namespace is found, stop the initialization here since the rest of the function will fail.
    if( namespacesCount == 0){
      addLog("No QuickSight Namespaces found. Please create a Namespace in QuickSight and try again.", "WARNING");
      return { status: 500, message: "No QuickSight Namespaces found. Please create a Namespace in QuickSight and try again.", namespacesList: [] }
    } else {
      addLog(`QuickSight Namespaces successfully fetched. Namespaces found: ${namespacesCount.toString()}`)
      addLog("Update Account Details with Namespace Counter")

      const {data: resAccountDetails, errors: errorsAccountDetails} = await client.models.AccountDetails.list({selectionSet: ['accountId']})
      if( errorsAccountDetails || resAccountDetails[0].accountId == null || resAccountDetails[0].accountId == undefined){
        const errorMessage = "Failed to fetch Account Details. " + JSON.stringify(errorsAccountDetails, null, 2)
        addLog(errorMessage, "ERROR", 500, "GraphQL-ListQueryFailed")
        return { status: 500, message: errorMessage, namespacesList: [] }
      }

      const accountParams = {
        accountId: resAccountDetails[0].accountId,
        qsManagementRegion: qsManagementRegion,
        namespacesCount: namespacesCount,
        groupsCount: 0,
        usersCount: 0,
      }

      const {data: resUpdateAccount, errors: errorsUpdateAccount} = await client.models.AccountDetails.update( accountParams )
      if( errorsUpdateAccount ){
        const errorMessage = "Failed to update Account Details. " + JSON.stringify(errorsUpdateAccount, null, 2)
        addLog(errorMessage, "ERROR", 500, "GraphQL-UpdateQueryFailed")
        return { status: 500, message: errorMessage, namespacesList: [] }
      }else if( resUpdateAccount ){
        addLog("Account Details successfully updated.")
      }
    }

    /**
     * Delete namespaces no more exising in QuickSight (if any)
     */
    // If there are namespace to delete, delete them. => Namespaces that have been removed from QuickSight must be removed also from the tool
    if( namespacesToDelete.length > 0){
      addLog(`Deleting ${namespacesToDelete.length} namespaces that are not in QuickSight anymore.`)
      for( const namespaceArn of namespacesToDelete ){
        const {data: resDeleteNamespace, errors: errorsDeleteNamespace} = await client.models.Namespace.delete({namespaceArn: namespaceArn})

        if( errorsDeleteNamespace ){
          const errorMessage = `Failed to delete Namespace "${namespaceArn}". ` + JSON.stringify(errorsDeleteNamespace, null, 2)
          addLog(errorMessage, "ERROR", 500, "GraphQL-DeleteQueryFailed")
          return { status: 500, message: errorMessage, namespacesList: [] }
        }else if( resDeleteNamespace?.namespaceArn == namespaceArn ){
          addLog(`Namespace "${namespaceArn}" successfully deleted.`)
        }
      }
    } else {
      addLog("No Namespace to delete.")
    }

    // If a Namespace has been deleted, all the Groups and Users linked to that namespace have to be removed from Dynamo
    if( !isFirstInit && namespaceNameToDelete.length > 0){
      for( const namespaceName of namespaceNameToDelete ){
        addLog(`Deleting Groups/Users that were in Namespace "${namespaceName}", cause that Namespace is not in QuickSight anymore.`)
        const {data: resListUserGroup, errors: errorsListUserGroup} = await client.models.UserGroup.list({
          filter: { namespaceName: { eq: namespaceName }}
        })

        if(errorsListUserGroup){
          const errorMessage = `Failed to fetch Groups/Users to delete. ` + JSON.stringify(errorsListUserGroup, null, 2)
          addLog(errorMessage, "ERROR", 500, "GraphQL-ListQueryFailed")
          return { status: 500, message: errorMessage, namespacesList: [] }
        }

        for(const groupUser of resListUserGroup){
          const {data: resDeleteUserGroup, errors: errorsDeleteUserGroup } = await client.models.UserGroup.delete({userGroupArn: groupUser.userGroupArn})

          if( errorsDeleteUserGroup ){
            const errorMessage = `Group/User "${groupUser.name}" failed to delete. ` + JSON.stringify(errorsDeleteUserGroup, null, 2)
            addLog(errorMessage, "ERROR", 500, "GraphQL-DeleteQueryFailed")
            return { status: 500, message: errorMessage, namespacesList: []}
          }else if( resDeleteUserGroup?.userGroupArn == groupUser.userGroupArn ){
            addLog(`Group/User "${groupUser.name}" successfully deleted.`)
          }
        }
      }
    }

    console.log(namespaceList)
    return { status: 200, message: "Namespaces successfully fetched.", namespacesList: namespaceList}
  }catch(err){
    return { status: 500, message: (err as Error).message , namespacesList: []}
  }
}