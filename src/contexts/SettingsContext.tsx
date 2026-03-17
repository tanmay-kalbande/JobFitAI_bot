import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AISettings } from '../types';
import { DEFAULT_SETTINGS } from '../types';
import { STORAGE_KEYS, getStorageItem, setStorageItem } from '../utils/storage';

interface SettingsContextType {
    settings: AISettings;
    setSettings: (settings: AISettings) => void;
    updateSettings: (updates: Partial<AISettings>) => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);

    // Load settings on mount
    useEffect(() => {
        const savedSettings = getStorageItem<AISettings>(STORAGE_KEYS.SETTINGS, DEFAULT_SETTINGS);
        setSettings(savedSettings);
    }, []);

    // Save settings when they change
    useEffect(() => {
        setStorageItem(STORAGE_KEYS.SETTINGS, settings);
    }, [settings]);

    const updateSettings = (updates: Partial<AISettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    return (
        <SettingsContext.Provider value={{ settings, setSettings, updateSettings }}>
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
