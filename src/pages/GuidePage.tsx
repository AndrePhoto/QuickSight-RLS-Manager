import { useEffect } from "react";
import { BreadcrumbGroup, ContentLayout, Header, SpaceBetween, TextContent} from "@cloudscape-design/components";

import { useHelpPanel } from '../contexts/HelpPanelContext';


function GuidePage () {
  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();


  useEffect(() => {
    
    setHelpPanelContent(
      <SpaceBetween size="l">
        <Header variant="h3">Guide:</Header>
        <TextContent>
          <p>Fill me.</p>
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

  return( 
    <>
      <BreadcrumbGroup
      items={[
        { text: "QS Managed RLS Tool", href: "/" },
        { text: "Guide", href: "/guide" },
      ]}
    />
    <ContentLayout
      defaultPadding
      header={
        <Header
          variant="h1"
          description="Here you can manage the Permissions for Row Level Security of you DataSets"
        >
        Guide
        </Header>
      }
    >
      
      <SpaceBetween size="l">
        <Header variant="h2">Permission Management</Header>
    
      </SpaceBetween>
    </ContentLayout>
    </>
  )
}

export default GuidePage;