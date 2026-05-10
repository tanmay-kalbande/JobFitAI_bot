/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type {
  CoverLetterData,
  ResumeData,
  ResumeEditLog,
  ResumeFormat,
  ResumeVersion,
} from '../types';

type StateSetter<T> = Dispatch<SetStateAction<T>>;

export interface ResumeContextType {
  resumeInput: string;
  setResumeInput: StateSetter<string>;
  jobDescription: string;
  setJobDescription: StateSetter<string>;
  generatedResume: ResumeData | null;
  setGeneratedResume: StateSetter<ResumeData | null>;
  generatedCoverLetter: CoverLetterData | null;
  setGeneratedCoverLetter: StateSetter<CoverLetterData | null>;
  atsKeywords: string[];
  setAtsKeywords: StateSetter<string[]>;
  atsEnabled: boolean;
  setAtsEnabled: StateSetter<boolean>;
  versions: ResumeVersion[];
  setVersions: StateSetter<ResumeVersion[]>;
  currentVersion: ResumeVersion | null;
  setCurrentVersion: StateSetter<ResumeVersion | null>;
  resumeFormat: ResumeFormat;
  setResumeFormat: StateSetter<ResumeFormat>;
  editLogs: ResumeEditLog[];
  setEditLogs: StateSetter<ResumeEditLog[]>;
}

const ResumeContext = createContext<ResumeContextType | null>(null);

export function ResumeProvider({ children, value }: { children: ReactNode; value: ResumeContextType }) {
  return (
    <ResumeContext.Provider value={value}>
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
