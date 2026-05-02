/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';

import type { AppTab, SaveHealthStatus } from '../utils/persistence';

type StateSetter<T> = Dispatch<SetStateAction<T>>;

export interface UIContextType {
  isLoading: boolean;
  setIsLoading: StateSetter<boolean>;
  loadingMessage: string;
  setLoadingMessage: StateSetter<string>;

  error: string;
  setError: StateSetter<string>;
  showSettings: boolean;
  setShowSettings: StateSetter<boolean>;
  showHome: boolean;
  setShowHome: StateSetter<boolean>;
  showAgent: boolean;
  setShowAgent: StateSetter<boolean>;
  activeTab: AppTab;
  setActiveTab: StateSetter<AppTab>;
  showChanges: boolean;
  setShowChanges: StateSetter<boolean>;
  showProofMap: boolean;
  setShowProofMap: StateSetter<boolean>;

  isResumeCollapsed: boolean;
  setIsResumeCollapsed: StateSetter<boolean>;
  showClearConfirm: boolean;
  setShowClearConfirm: StateSetter<boolean>;
  showQuickEdit: boolean;
  setShowQuickEdit: StateSetter<boolean>;
  showEditHistory: boolean;
  setShowEditHistory: StateSetter<boolean>;
  showLanding: boolean;
  setShowLanding: StateSetter<boolean>;
  hasHydrated: boolean;
  setHasHydrated: StateSetter<boolean>;
  saveHealthStatus: SaveHealthStatus;
  setSaveHealthStatus: StateSetter<SaveHealthStatus>;
  lastSavedAt: string | null;
  setLastSavedAt: StateSetter<string | null>;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children, value }: { children: ReactNode; value: UIContextType }) {
  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error('useUI must be used within a UIProvider');
  }
  return context;
}
