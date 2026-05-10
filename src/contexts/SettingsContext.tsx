/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { AISettings } from '../types';

type StateSetter<T> = Dispatch<SetStateAction<T>>;

export interface SettingsContextType {
  settings: AISettings;
  setSettings: StateSetter<AISettings>;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children, value }: { children: ReactNode; value: SettingsContextType }) {
  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
