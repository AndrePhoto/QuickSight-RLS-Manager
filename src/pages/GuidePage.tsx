import { useEffect, useState } from "react";
import { 
  ContentLayout, 
  Container,
  Header, 
  SpaceBetween, 
  Tabs,
  Box
} from "@cloudscape-design/components";
import { useHelpPanel } from '../contexts/HelpPanelContext';
import { useBreadCrumb } from '../contexts/BreadCrumbContext';
import { BreadcrumbGroup } from "@cloudscape-design/components";

// Import guide content components
import { OverviewContent } from '../components/Guide/OverviewContent';
import { CompleteGuideContent } from '../components/Guide/CompleteGuideContent';
import { InstallContent } from '../components/Guide/InstallContent';
import { InitializationContent } from '../components/Guide/InitializationContent';
import { ManagePermissionsContent } from '../components/Guide/ManagePermissionsContent';
import { TechnicalDocsContent } from '../components/Guide/TechnicalDocsContent';

function GuidePage() {
  const { setHelpPanelContent, setIsHelpPanelOpen } = useHelpPanel();
  const { setBreadCrumbContent } = useBreadCrumb();
  const [activeTabId, setActiveTabId] = useState("overview");

  useEffect(() => {
    setHelpPanelContent(
      <SpaceBetween size="l">
        <Header variant="h3">User Guide</Header>
        <Box>
          <p>This comprehensive guide covers everything you need to know about the QuickSight RLS Manager.</p>
        </Box>
      </SpaceBetween>
    );
    setIsHelpPanelOpen(false);

    setBreadCrumbContent(
      <BreadcrumbGroup
        items={[
          { text: "QS Managed RLS Tool", href: "/" },
          { text: "User Guide", href: "/guide" },
        ]}
      />
    );

    // Cleanup when component unmounts
    return () => {
      setHelpPanelContent(null);
      setBreadCrumbContent(null);
      setIsHelpPanelOpen(false);
    };
  }, [setHelpPanelContent, setBreadCrumbContent, setIsHelpPanelOpen]);

  return (
    <ContentLayout
      defaultPadding
      header={
        <Header
          variant="h1"
          description="Complete documentation for the QuickSight Row-Level Security Manager"
        >
          User Guide
        </Header>
      }
    >
      <Container>
        <Tabs
          activeTabId={activeTabId}
          onChange={({ detail }) => setActiveTabId(detail.activeTabId)}
          tabs={[
            {
              id: "overview",
              label: "Overview",
              content: <OverviewContent />
            },
            {
              id: "complete-guide",
              label: "Complete Guide",
              content: <CompleteGuideContent />
            },
            {
              id: "installation",
              label: "Installation",
              content: <InstallContent />
            },
            {
              id: "initialization",
              label: "Initialization",
              content: <InitializationContent />
            },
            {
              id: "manage-permissions",
              label: "Managing Permissions",
              content: <ManagePermissionsContent />
            },
            {
              id: "technical",
              label: "Technical Docs",
              content: <TechnicalDocsContent />
            }
          ]}
        />
      </Container>
    </ContentLayout>
  );
}

export default GuidePage;