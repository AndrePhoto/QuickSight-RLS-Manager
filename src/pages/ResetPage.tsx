import { useState } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { 
  Button, 
  Container, 
  ContentLayout, 
  Header,
  SpaceBetween,
  TextContent,
} from "@cloudscape-design/components";
import { CodeView } from "@cloudscape-design/code-view";

// Define Schema to get Models from backend.
const client = generateClient<Schema>();

function ResetPage() {
  const [logs, setLogs] = useState<string>("")
  /**
   * Add Log to output text area
   * type can be ERROR or WARNING
   */
  const addLog = (log: string, type?: string) => {
    setLogs((prevLogs) => {
      if( type && (type ==='ERROR' || type ==='WARNING')){
        log = `[${type}]: ${log}`
      }else{
        log = `[INFO]: ${log}`
      }
      if( prevLogs === ""){
        return log
      }
      const newLogs = `${prevLogs}\n${log}`;
      return newLogs;
    });
  };

  const resetDynamo = async () => {
    setLogs("")

    // Permissions
    addLog("Fetching Permissions if any")
    let permissionsCount=0
    const permissions = await client.models.Permission.list()
    addLog("Deleting Permissions if any")
    for (const permission of permissions.data) {
      await client.models.Permission.delete({
        id: permission.id,
      });
      permissionsCount++
    }
    addLog(`Deleted ${permissionsCount} permissions`)

    // Datasets
    addLog("Fetching Datasets if any")
    let datasetsCount=0
    const datasets = await client.models.DataSet.list()
    console.log(datasets)
    addLog("Deleting Datasets if any")
    for (const dataset of datasets.data) {
      await client.models.DataSet.delete({
        dataSetArn: dataset.dataSetArn,
      });
      datasetsCount++;
    }
    addLog(`Deleted ${datasetsCount} datasets`)

    // Users - Groups
    addLog("Fetching Users and Groups if any")
    let usersCount=0
    const userGroups = await client.models.UserGroup.list()
    addLog("Deleting Users and Groups if any")
    for (const userGroup of userGroups.data) {
      await client.models.UserGroup.delete({
        userGroupArn: userGroup.userGroupArn,
      });
      usersCount++;
    }
    addLog(`Deleted ${usersCount} users and groups`)

    // Namespaces
    addLog("Fetching Namespaces if any")
    let namespacesCount=0
    const namespaces = await client.models.Namespace.list()
    addLog("Deleting Namespaces if any")
    for (const namespace of namespaces.data) {
      await client.models.Namespace.delete({
        namespaceArn: namespace.namespaceArn,
      });
      namespacesCount++;
    }
    addLog(`Deleted ${namespacesCount} namespaces`)

    // Account Data
    addLog("Fetching Account Data if any")
    const accountData = await client.models.AccountDetails.list()
    addLog("Deleting Account Data if any")
    for (const account of accountData.data) {
      await client.models.AccountDetails.delete({
        accountId: account.accountId,
      });
    }
    addLog(`Deleted Account Data`)

    // Managed Regions
    addLog("Fetching Regions Data if any")
    let regionCount = 0;
    const regionsData = await client.models.ManagedRegion.list()
    addLog("Deleting Regions Data if any")
    for (const region of regionsData.data) {
      await client.models.ManagedRegion.delete({
        regionName: region.regionName,
      });
      regionCount++;
    }
    addLog(`Deleted ${regionCount} Regions`)

    addLog("Done!")
  }

  return (
    <>
      <ContentLayout
        header={
          <Header
            variant="h1"
          >
            Reset Page
          </Header>
      }>
        <Container
          header={
            <Header
              variant="h2"
            >
              Pirates, ye be warned!
            </Header>
          }

        >
          <SpaceBetween size="l">
            <TextContent><p>This button will reset the DynamoDB database.<br></br>This is a destructive action and will delete all data from the database.</p></TextContent>
            <Button
              onClick={resetDynamo}
              variant="primary"
              iconName="security"
            >
              Reset Dynamo
            </Button>
            { logs ? (
            <CodeView 
              content={ logs }
              lineNumbers
              wrapLines
            />) : undefined }
          </SpaceBetween>
        </Container>
      </ContentLayout>
    </>
  )
}

export default ResetPage;