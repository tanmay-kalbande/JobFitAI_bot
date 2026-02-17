import { createContext, useContext, useState, useRef, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { ResumeData, ResumeVersion } from '../types';
import { STORAGE_KEYS, getStorageItem, setStorageItem, getStorageString, setStorageString } from '../utils/storage';
import { APP_CONSTANTS } from '../types';
import { useDebounce } from '../hooks/useDebounce';

interface ResumeContextType {
    // Resume input/output
    resumeInput: string;
    setResumeInput: (value: string) => void;
    jobDescription: string;
    setJobDescription: (value: string) => void;
    generatedResume: ResumeData | null;
    setGeneratedResume: (value: ResumeData | null) => void;

    // ATS features
    atsKeywords: string[];
    setAtsKeywords: (keywords: string[]) => void;
    atsEnabled: boolean;
    setAtsEnabled: (value: boolean) => void;
    showHiddenKeywords: boolean;
    setShowHiddenKeywords: (value: boolean) => void;

    // Version history
    versions: ResumeVersion[];
    setVersions: (versions: ResumeVersion[]) => void;
    currentVersion: ResumeVersion | null;
    setCurrentVersion: (version: ResumeVersion | null) => void;



    // Streaming
    isStreaming: boolean;
    setIsStreaming: (value: boolean) => void;
    streamingTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

const ResumeContext = createContext<ResumeContextType | null>(null);

export function ResumeProvider({ children }: { children: ReactNode }) {
    const [resumeInput, setResumeInput] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [generatedResume, setGeneratedResume] = useState<ResumeData | null>(null);
    const [atsKeywords, setAtsKeywords] = useState<string[]>([]);
    const [atsEnabled, setAtsEnabled] = useState(false);
    const [showHiddenKeywords, setShowHiddenKeywords] = useState(false);
    const [versions, setVersions] = useState<ResumeVersion[]>([]);
    const [currentVersion, setCurrentVersion] = useState<ResumeVersion | null>(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const streamingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Debounce resume input for auto-save
    const debouncedResumeInput = useDebounce(resumeInput, APP_CONSTANTS.DEBOUNCE_DELAY_MS);

    // Load saved data on mount
    useEffect(() => {
        setResumeInput(getStorageString(STORAGE_KEYS.RESUME_DATA, ''));
        setVersions(getStorageItem<ResumeVersion[]>(STORAGE_KEYS.VERSIONS, []));
    }, []);

    // Save resume data when debounced value changes
    useEffect(() => {
        if (debouncedResumeInput) {
            setStorageString(STORAGE_KEYS.RESUME_DATA, debouncedResumeInput);
        }
    }, [debouncedResumeInput]);

    // Save versions
    useEffect(() => {
        if (versions.length > 0) {
            setStorageItem(STORAGE_KEYS.VERSIONS, versions);
        }
    }, [versions]);

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (streamingTimeoutRef.current) {
                clearTimeout(streamingTimeoutRef.current);
            }
        };
    }, []);

    return (
        <ResumeContext.Provider
            value={{
                resumeInput,
                setResumeInput,
                jobDescription,
                setJobDescription,
                generatedResume,
                setGeneratedResume,
                atsKeywords,
                setAtsKeywords,
                atsEnabled,
                setAtsEnabled,
                showHiddenKeywords,
                setShowHiddenKeywords,
                versions,
                setVersions,
                currentVersion,
                setCurrentVersion,
                isStreaming,
                setIsStreaming,
                streamingTimeoutRef,
            }}
        >
            {children}
        </ResumeContext.Provider>
    );
}

export function useResume() {
    const context = useContext(ResumeContext);
    if (!context) {
        throw new Error('useResume must be used within a ResumeProvider');
    }
    return context;
}
