import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

interface UIContextType {
    // Loading states
    isLoading: boolean;
    setIsLoading: (value: boolean) => void;
    loadingMessage: string;
    setLoadingMessage: (value: string) => void;
    isFixing: boolean;
    setIsFixing: (value: boolean) => void;

    // Error state
    error: string;
    setError: (value: string) => void;

    // Modal states
    showSettings: boolean;
    setShowSettings: (value: boolean) => void;
    showChanges: boolean;
    setShowChanges: (value: boolean) => void;
    showHistory: boolean;
    setShowHistory: (value: boolean) => void;
    showClearConfirm: boolean;
    setShowClearConfirm: (value: boolean) => void;
    showConfetti: boolean;
    setShowConfetti: (value: boolean) => void;

    // Tab/layout states
    activeTab: 'input' | 'preview';
    setActiveTab: (tab: 'input' | 'preview') => void;
    isResumeCollapsed: boolean;
    setIsResumeCollapsed: (value: boolean) => void;
}

const UIContext = createContext<UIContextType | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
    // Loading states
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [isFixing, setIsFixing] = useState(false);

    // Error state
    const [error, setError] = useState('');

    // Modal states
    const [showSettings, setShowSettings] = useState(false);
    const [showChanges, setShowChanges] = useState(false);
    const [showHistory, setShowHistory] = useState(false);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [showConfetti, setShowConfetti] = useState(false);

    // Tab/layout states
    const [activeTab, setActiveTab] = useState<'input' | 'preview'>('input');
    const [isResumeCollapsed, setIsResumeCollapsed] = useState(false);

    return (
        <UIContext.Provider
            value={{
                isLoading,
                setIsLoading,
                loadingMessage,
                setLoadingMessage,
                isFixing,
                setIsFixing,
                error,
                setError,
                showSettings,
                setShowSettings,
                showChanges,
                setShowChanges,
                showHistory,
                setShowHistory,
                showClearConfirm,
                setShowClearConfirm,
                showConfetti,
                setShowConfetti,
                activeTab,
                setActiveTab,
                isResumeCollapsed,
                setIsResumeCollapsed,
            }}
        >
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
