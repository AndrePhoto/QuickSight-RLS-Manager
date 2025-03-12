import { useState, useEffect } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Box, BreadcrumbGroup, ButtonDropdown, Container, ContentLayout, Header, Link, SpaceBetween, Table, TextContent } from "@cloudscape-design/components";
import { useHelpPanel } from "../contexts/HelpPanelContext";

const client = generateClient<Schema>();

function UsersListPage() {
  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();

  const [users, setUsers] = useState<any[]>([]);

  const [maxUpdatedAt, setMaxUpdatedAt] = useState<string>("")

  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    setIsLoading(true)
    const loadUsers = async () => {
      try {
        const userData = await fetchUsersUsers('User');
        setUsers(userData || []);
        fetchAccountDetails();
      } catch (err) {
        throw new Error(`Error fetching users: ${err}`);
      } finally{
        setIsLoading(false)
      }
    };
  
    loadUsers();

    setHelpPanelContent(
      <SpaceBetween size="l">
        <TextContent><p>These are the <i>QuickSight Users</i> found in your instance.</p>
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

  const fetchUsersUsers = async (filterValue?: string) => {
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
      throw new Error(`Error fetching users: ${err}`);
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

  return (
    <>
      <BreadcrumbGroup
        items={[
          { text: "QS Managed RLS Tool", href: "/" },
          { text: "Explore Data", href: "/" },
          { text: "Users", href: "/users-list" },
        ]}
      />
      <ContentLayout
        defaultPadding
        header={
          <Header
            variant="h1"
            description="These are the Users of your QuickSight Account synchronized with the tool."
          >
          Explore Data: Users
          </Header>
        }
      >
        <SpaceBetween size="l">
          <Container
          >

            <Table
              loadingText="Loading QuickSight Users"
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
                          text: "Refresh Users",
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
                Users List
              </Header>
              }
              empty={
                <Box
                  margin={{ vertical: "xs" }}
                  textAlign="center"
                  color="inherit"
                >
                  <TextContent>
                    <p><strong>No Users Found.</strong></p>
                    <p>Please check that you have Users in QuickSight.</p>
                    <p>If you think you should see Users here, go to <Link href="/">Homepage</Link> to launch <strong>resources update</strong>.</p>
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
                  id: "UserName",
                  header: "User Name",
                  cell: (item: any) => item.name,
                },
                {
                  id: "Email",
                  header: "Email",
                  cell: (item: any) => item.email,
                },
                {
                  id: "Role",
                  header: "Role",
                  cell: (item: any) => item.role,
                },
                {
                  id: "Description",
                  header: "Description",
                  cell: (item: any) => item.description,
                },
                {
                  id: "IdentityType",
                  header: "Identity Type",
                  cell: (item: any) => item.identityType,
                },
                {
                  id: "UserArn",
                  header: "User Arn",
                  cell: (item: any) => item.userGroupArn,
                },
              ]}
              items={users}
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

export default UsersListPage;