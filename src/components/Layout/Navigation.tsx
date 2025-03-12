import React from 'react';
import { SideNavigation, SideNavigationProps } from '@cloudscape-design/components';
import { useNavigate } from 'react-router-dom';

export const Navigation: React.FC = () => {
  const navigate = useNavigate();

  const navigationItems: SideNavigationProps.Item[] = [
    {
      type: "section",
      text: "RLS Managed Tool",
      items: [
        {
          type: "link",
          text: "Global Settings",
          href: "/",
        },
        /*{
          type: "link",
          text: "Guide",
          href: "/guide",
        },*/
      ]
    },
    {
        type: "section",
        text: "Permissions",
        items: [
            {
              type: "link",
              text: "Manage Permissions",
              href: "/manage-permissions",
            },
        ]
    },
    {
      type: "section",
      text: "Explore",
      items: [
        {
        type: "link",
        text: "Namespaces List",
        href: "/namespaces-list",
        },
        {
          type: "link",
          text: "Groups List",
          href: "/groups-list",
        },
        {
          type: "link",
          text: "Users List",
          href: "/users-list",
        },
        {
          type: "link",
          text: "DataSets List",
          href: "/datasets-list",
        }
      ]
    },
    {
      type: "section",
      text: "DEV",
      items: [
        {
          type: "link",
          text: "TODO List",
          href: "/todo",
        },
        {
          type: "link",
          text: "Reset Page",
          href: "/reset",
        },
        /*{
          type: "link",
          text: "Test Page",
          href: "/test",
        },*/
      ]
    }
  ];

  return (
    <SideNavigation
      items={navigationItems}
      header={{
        href: "#",
        text: "QuickSight RLS Manager"
      }}
      onFollow={(evt) => {
        evt.preventDefault();
        if (evt.detail.href !== "#") {
          navigate(evt.detail.href);
        }
      }}
    />
  );
};
