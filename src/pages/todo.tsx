import { Container, ContentLayout, Header, SpaceBetween, TextContent } from "@cloudscape-design/components";
import { useEffect } from "react";
import { useHelpPanel } from "../contexts/HelpPanelContext";

function TODO() {

  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();

  useEffect(() => {

    setHelpPanelContent(
      <SpaceBetween size="l">
        <TextContent><p>Hi! Please don't mind me. I'm just trying to keep trace of the future enanchement and bug fixing.</p>
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
            TODOs
          </Header>
        }
      >
        <ul>
          <li><h3>Todo List</h3></li>
          <ul>
            <li>Import permissions from existing CSV</li>
            <li>Add Pagination and filters in all the tables (as in the DataSet List Page)</li>
          </ul>
          <li><h3>Improvements</h3></li>
          <ul>
            <li>App reachable only internally</li>
            <li>Block users creation</li>
            <li>WARNING when spice capacity is too low</li>
            <li>Limitation of 999 rows per RLS</li>
            <li>If tool managed, give the possibility to load previous versions of RLS from S3 versioning</li>
            <li>Multi AWS Account?</li>
            <li>Add the possiiblity to choose which users/groups can see the RLS created</li>
          </ul>
        </ul>
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

export default TODO