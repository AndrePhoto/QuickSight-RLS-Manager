// src/contexts/BreadCrumbContext.tsx
import { createContext, useContext, ReactNode, useState } from 'react';

interface BreadCrumbContextType {
  setBreadCrumbContent: (content: ReactNode) => void;
  breadCrumbContent: ReactNode;
}

const BreadCrumbContext = createContext<BreadCrumbContextType | undefined>(undefined);

export function BreadCrumbProvider({ children }: { children: ReactNode }) {
  const [breadCrumbContent, setBreadCrumbContent] = useState<ReactNode>(null);

  return (
    <BreadCrumbContext.Provider 
      value={{ 
        breadCrumbContent, 
        setBreadCrumbContent,
      }}
    >
      {children}
    </BreadCrumbContext.Provider>
  );
}

export function useBreadCrumb() {
  const context = useContext(BreadCrumbContext);
  if (context === undefined) {
    throw new Error('useBreadCrumb must be used within a BreadCrumbProvider');
  }
  return context;
}
