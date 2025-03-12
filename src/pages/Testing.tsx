import { Button, Container, ContentLayout, Header, SpaceBetween, TextContent } from "@cloudscape-design/components";
import { useHelpPanel } from "../contexts/HelpPanelContext";
import { useState, useEffect } from "react";
import type { Schema } from "../../amplify/data/resource";
import { generateClient } from 'aws-amplify/data';

// Initialize the Amplify Data client
const client = generateClient<Schema>();

function Testing() {

  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();

  useEffect(() => {

    setHelpPanelContent(
      <SpaceBetween size="l">
        <TextContent><p>Hi! Please don't mind me. I'm just a page to test new features.</p>
        <p>But hey: if you want to help, if you find a bug or if you have requests, write to <strong>andrepgn@amazon.com</strong></p>
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

  return (
    <ContentLayout
      header={
        <Header>
          Development Page
        </Header>
        }
      >
      <Container
        header={
          <Header>
            Testing
          </Header>
        }
      >
        <Button
          onClick={() => client.queries.checkQSManagementRegionAccess({
            qsManagementRegion: "us-east-1"
          })}
        >
          Create S3 Bucket Test
        </Button>
      </Container>
    </ContentLayout>

  )
  //https://community.amazonquicksight.com/t/understanding-namespaces-groups-users-and-shared-folder-in-amazon-quicksight/13158
  /**
   * Namespaces - Cross Region
   * DataSets > Region Specific
   * Users-Groups > Cross Region, but linked to the management region
   */
}

export default Testing