import ReactDOM from "react-dom/client";
import { Authenticator } from '@aws-amplify/ui-react';
import { Amplify } from "aws-amplify";
import outputs from "../amplify_outputs.json";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Navigation} from "./components/Layout/Navigation.tsx";

import '@aws-amplify/ui-react/styles.css';
import './styles/qs-rls-tool.css';

import {
  AppLayout,
  HelpPanel,
  TextContent,
  TopNavigation,
} from '@cloudscape-design/components';
import Homepage from "./pages/Homepage.tsx";
import GroupsListPage from "./pages/GroupsListPage.tsx";
import ResetPage from "./pages/ResetPage.tsx";
import ManagePermissionsPage from "./pages/ManagePermissionsPage.tsx";
import UsersListPage from "./pages/UsersListPage.tsx";
import NamespacesListPage from "./pages/NamespacesListPage.tsx";
import DataSetsListPage from "./pages/DataSetsListPage.tsx";
//import GuidePage from "./pages/GuidePage.tsx";

import { HelpPanelProvider, useHelpPanel } from './contexts/HelpPanelContext.tsx';
import { BreadCrumbProvider, useBreadCrumb } from './contexts/BreadCrumbContext.tsx';

Amplify.configure(outputs); 

function MainLayout() {
  const { helpPanelContent, isHelpPanelOpen, setIsHelpPanelOpen } = useHelpPanel();
  const { breadCrumbContent } = useBreadCrumb();
  return(
    <div id="content-panel">
    <AppLayout
      navigation={
        <Navigation/>
      }
      headerSelector="#top-navigation-panel"
      footerSelector="#footer-panel"
      breadcrumbs={ breadCrumbContent || null }
      toolsOpen={isHelpPanelOpen}
      onToolsChange={({ detail }) => setIsHelpPanelOpen(detail.open)}
      tools={
        <HelpPanel header={<h2>Help Panel</h2>}>
          {helpPanelContent || 'Select a page to see specific help content'}
        </HelpPanel>
      }
      content={
        <div>
          <Routes>
            <Route path="*" element={<Homepage />} />

            <Route path="/groups-list" element={<GroupsListPage />} />
            <Route path="/users-list" element={<UsersListPage />} />
            <Route path="/namespaces-list" element={<NamespacesListPage />} />
            <Route path="/datasets-list" element={<DataSetsListPage />} />

            <Route path="/manage-permissions" element={<ManagePermissionsPage />} />

            {/*<Route path="/guide" element={<GuidePage />} />*/}

            <Route path="/reset" element={<ResetPage />} />
          </Routes>
        </div>
      }
    />
    </div>
  )
}
/**
 * 
 */
ReactDOM.createRoot(document.getElementById("root")!).render(
  <>
    {/*<GlobalStyle />*/}
    <Authenticator>
      {({ signOut, user }) => (
        <Router>
          <div id="top-navigation-panel" role="navigation">
            <TopNavigation
              identity={
                {
                  href: "#",
                  title: "Row Level Security Manager",
                  logo: {
                    src: "/src/assets/QS-RLS-Logo.png",
                    alt: "QS-RLS"
                  }
                }
              }
              utilities={[
                {
                  type: "button",
                  text: user?.username,
                  iconName: "user-profile",
                  
                },
                {
                  type: "button",
                  text: "Logout",
                  onClick: signOut,
                }
              ]}
            /> 
          </div>
        <HelpPanelProvider>
          <BreadCrumbProvider>
            <MainLayout />
          </BreadCrumbProvider>
        </HelpPanelProvider>
        <div id="footer-panel">
          <footer>
            <TextContent><p>QuickSight Managed Row Level Security Tool developed by <a href="mailto:andrepgn@amazon.com">andrepgn@amazon.com</a>. Please refer to andrepgn for any hint, bug, or improvement idea.</p></TextContent>
          </footer>
        </div>
        </Router>
      )}
    </Authenticator>
  </>
);
