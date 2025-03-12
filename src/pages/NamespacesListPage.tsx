import { useState, useEffect } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from "aws-amplify/data";
import { Box, BreadcrumbGroup, ButtonDropdown, Container, ContentLayout, Header, Link, SpaceBetween, Table, TextContent } from "@cloudscape-design/components";
import { useHelpPanel } from "../contexts/HelpPanelContext";

const client = generateClient<Schema>();

function NamespaceListPage() {
  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();

  const [namespace, setNamespace] = useState<any[]>([]);

  const [maxUpdatedAt, setMaxUpdatedAt] = useState<string>("")

  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    setIsLoading(true)
    const loadUsers = async () => {
      try {
        const namespaceData = await fetchNamespaces();
        setNamespace(namespaceData || []);
        fetchAccountDetails();
      } catch (err) {
        throw new Error(`Error fetching namespaces: ${err}`);
      } finally{
        setIsLoading(false)
      }
    };
  
    loadUsers();

    setHelpPanelContent(
      <SpaceBetween size="l">
        <TextContent><p>These are the <i>QuickSight Namespaces</i> found in your instance.</p>
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

  const fetchNamespaces = async () => {
    
    try {
      const response = await client.models.Namespace.list();
      return response.data;
    } catch (err) {
      console.error('Error fetching namespaces:', err);
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
          { text: "Namespaces", href: "/namespaces-list" },
        ]}
      />
      <ContentLayout
        defaultPadding
        header={
          <Header
            variant="h1"
            description="These are the Namespaces of your QuickSight Account synchronized with the tool."
          >
          Explore Data: Namespaces
          </Header>
        }
      >
        <SpaceBetween size="l">
          <Container
          >

            <Table
              loadingText="Loading QuickSight Namespaces"
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
                          text: "Refresh Namespaces",
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
                Namespaces List
              </Header>
              }
              empty={
                <Box
                  margin={{ vertical: "xs" }}
                  textAlign="center"
                  color="inherit"
                >
                  <TextContent>
                    <p><strong>No Namespaces Found.</strong></p>
                    <p>Please check that you have Namespaces in QuickSight.</p>
                    <p>If you think you should see Namespaces here, go to <Link href="/">Homepage</Link> to launch <strong>resources update</strong>.</p>
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
                  id: "Arn",
                  header: "Arn",
                  cell: (item: any) => item.namespaceArn,
                },
                {
                  id: "CapacityRegion",
                  header: "Capacity Region",
                  cell: (item: any) => item.capacityRegion,
                },
              ]}
              columnDisplay={[
                { id: "Namespace", visible: true },
                { id: "Arn", visible: true },
                { id: "CapacityRegion", visible: false },
              ]}
              items={namespace}
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

export default NamespaceListPage;