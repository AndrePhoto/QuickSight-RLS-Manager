import { useState, useEffect } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Box, BreadcrumbGroup, ButtonDropdown, Container, ContentLayout, Header, Link, SpaceBetween, Table, TextContent } from "@cloudscape-design/components";
import { useHelpPanel } from "../contexts/HelpPanelContext";

const client = generateClient<Schema>();

function GroupsListPage() {
  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();

  const [groups, setGroups] = useState<any[]>([]);

  const [maxUpdatedAt, setMaxUpdatedAt] = useState<string>("")

  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    setIsLoading(true)
    const loadUsers = async () => {
      try {
        const groupData = await fetchUsersGroups('Group');
        setGroups(groupData || []);
        fetchAccountDetails();
      } catch (err) {
        throw new Error(`Error fetching groups: ${err}`);
      } finally{
        setIsLoading(false)
      }
    };
  
    loadUsers();

    setHelpPanelContent(
      <SpaceBetween size="l">
        <TextContent><p>These are the <i>QuickSight Groups</i> found in your instance.</p>
          </TextContent>
      </SpaceBetween>
    );
    setIsHelpPanelOpen(false); 

    // Cleanup when component unmounts
    return () => {
      setHelpPanelContent(null);
      setIsHelpPanelOpen(false);
    };
  }, [setHelpPanelContent]);

  const fetchUsersGroups = async (filterValue?: string) => {
    try {
      const response = await client.models.UserGroup.list({
        filter: filterValue ? {
          userGroup: {
            eq: filterValue
          }
        } : undefined
      });
      return response.data;
    } catch (err) {
      throw new Error(`Error fetching groups: ${err}`);
    }
  };

  const fetchAccountDetails = async () => {

    try {
      const response = await client.models.AccountDetails.list({
        authMode: 'userPool'
      });
      if (response.data.length > 0 && response.data[0]) { 
        setMaxUpdatedAt(response.data[0].updatedAt || "")
      }else{
        console.warn("Fetching Account Details: Account Details are not available. Please enter them.")
      }
    } catch (err) {
      console.error('Fetching Account Details: Error fetching Account Details:', err);
    } 
  };

  return ( // TODO ADD MODAL
    <> 
      <BreadcrumbGroup
        items={[
          { text: "QS Managed RLS Tool", href: "/" },
          { text: "Explore Data", href: "/" },
          { text: "Groups", href: "/groups-list" },
        ]}
      />
      <ContentLayout
        defaultPadding
        header={
          <Header
            variant="h1"
            description="These are the Groups of your QuickSight Account synchronized with the tool."
          >
          Explore Data: Groups
          </Header>
        }
      >
        <SpaceBetween size="l">
          <Container
          >

            <Table
              loadingText="Loading QuickSight Groups"
              loading={isLoading}
              sortingDisabled
              stripedRows
              wrapLines
              variant="embedded"
              header={
                <Header
                variant="h2"
                description={`Last Update: ${maxUpdatedAt || ''}`}
                actions={
                  <SpaceBetween
                  direction="horizontal"
                  size="xs"
                  >
                    <ButtonDropdown
                      items={[
                        {
                          text: "Refresh Groups",
                          id: "rm",
                          disabled: true
                        },
                      ]}
                    >
                      Actions
                    </ButtonDropdown>
                  </SpaceBetween>
                }
              >
                Groups List
              </Header>
              }
              empty={
                <Box
                  margin={{ vertical: "xs" }}
                  textAlign="center"
                  color="inherit"
                >
                  <TextContent>
                    <p><strong>No Groups Found.</strong></p>
                    <p>Please check that you have Groups in QuickSight.</p>
                    <p>If you think you should see Groups here, go to <Link href="/">Homepage</Link> to launch <strong>resources update</strong>.</p>
                  </TextContent>
                </Box>
              }
              columnDefinitions={[
                {
                  id: "Namespace",
                  header: "Namespace",
                  cell: (item: any) => item.namespaceName,
                },
                {
                  id: "GroupName",
                  header: "Group Name",
                  cell: (item: any) => item.name,
                },
                {
                  id: "GroupArn",
                  header: "Group Arn",
                  cell: (item: any) => item.userGroupArn,
                },
              ]}
              items={groups}
              /*
              preferences={
                <CollectionPreferences 
                  title="Preferences"
                  confirmLabel="Confirm"
                  cancelLabel="Cancel"
                  preferences={{
                    pageSize: 10,
                  }}
                  pageSizePreference={{
                    title: "Page size",
                    options: [
                      { value: 10, label: "10 resources" },
                      { value: 20, label: "20 resources" },
                      { value: 50, label: "50 resources" },
                      { value: 100, label: "100 resources" }
                    ]
                  }}
                />
              }*/
            />
          </Container>
        </SpaceBetween>
      </ContentLayout>
    </>
  );
}

export default GroupsListPage;