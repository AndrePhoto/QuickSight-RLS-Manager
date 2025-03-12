// src/contexts/HelpPanelContext.tsx
import { createContext, useContext, ReactNode, useState } from 'react';

interface HelpPanelContextType {
  setHelpPanelContent: (content: ReactNode) => void;
  helpPanelContent: ReactNode;
  isHelpPanelOpen: boolean;
  setIsHelpPanelOpen: (isOpen: boolean) => void;
}

const HelpPanelContext = createContext<HelpPanelContextType | undefined>(undefined);

export function HelpPanelProvider({ children }: { children: ReactNode }) {
  const [helpPanelContent, setHelpPanelContent] = useState<ReactNode>(null);
  const [isHelpPanelOpen, setIsHelpPanelOpen] = useState<boolean>(false);

  return (
    <HelpPanelContext.Provider 
      value={{ 
        helpPanelContent, 
        setHelpPanelContent,
        isHelpPanelOpen,
        setIsHelpPanelOpen
      }}
    >
      {children}
    </HelpPanelContext.Provider>
  );
}

export function useHelpPanel() {
  const context = useContext(HelpPanelContext);
  if (context === undefined) {
    throw new Error('useHelpPanel must be used within a HelpPanelProvider');
  }
  return context;
}
