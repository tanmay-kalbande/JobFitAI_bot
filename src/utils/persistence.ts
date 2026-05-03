import type {
  AISettings,
  CoverLetterData,
  ResumeData,
  ResumeEditLog,
  ResumeFormat,
  ResumeVersion,
} from '../types';
import { DEFAULT_SETTINGS, generateId } from '../types';
import type { StorageWriteResult } from './storage';

export type AppTab = 'input' | 'preview';
export type SaveHealthStatus = 'saved' | 'saving' | 'backup_recommended';

export interface PersistedAppState {
  schemaVersion: number;
  savedAt: string;
  resumeInput: string;
  jobDescription: string;
  generatedResume: ResumeData | null;
  generatedCoverLetter: CoverLetterData | null;
  atsKeywords: string[];
  atsEnabled: boolean;
  settings: AISettings;
  activeTab: AppTab;
  versions: ResumeVersion[];
  currentVersionId: string | null;
  isResumeCollapsed: boolean;
  resumeFormat: ResumeFormat;
  editLogs: ResumeEditLog[];
}

export interface RestoredAppSession {
  resumeInput: string;
  jobDescription: string;
  generatedResume: ResumeData | null;
  generatedCoverLetter: CoverLetterData | null;
  atsKeywords: string[];
  atsEnabled: boolean;
  settings: AISettings;
  activeTab: AppTab;
  versions: ResumeVersion[];
  currentVersion: ResumeVersion | null;
  isResumeCollapsed: boolean;
  resumeFormat: ResumeFormat;
  editLogs: ResumeEditLog[];
}

export interface VersionSelectionState {
  currentVersion: ResumeVersion | null;
  generatedResume: ResumeData | null;
  generatedCoverLetter: CoverLetterData | null;
  atsKeywords: string[];
  activeTab: AppTab;
}

export const APP_STORAGE_SCHEMA_VERSION = 3;

function isCoverLetterData(data: ResumeVersion['data'] | null | undefined): data is CoverLetterData {
  return !!data && typeof data === 'object' && 'opening' in data && 'body' in data && 'signoff' in data;
}

function isResumeData(data: ResumeVersion['data'] | null | undefined): data is ResumeData {
  return !!data && typeof data === 'object' && 'summary' in data && 'experiences' in data;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    : [];
}

function normalizeVersionType(type: string | undefined): ResumeVersion['type'] {
  switch (type) {
    case 'tailored':
    case 'fixed':
    case 'cover-letter':
    case 'cv':
      return type;
    default:
      return 'base';
  }
}

function normalizeResumeFormat(value: unknown): ResumeFormat {
  return value === 'modern' ? 'modern' : value === 'executive' ? 'executive' : 'classic';
}

function normalizeActiveTab(value: unknown): AppTab {
  return value === 'preview' ? 'preview' : 'input';
}

export function sanitizeSettings(settings: Partial<AISettings> | null | undefined): AISettings {
  return {
    ...DEFAULT_SETTINGS,
    ...settings,
    userName: typeof settings?.userName === 'string' ? settings.userName.trim() : '',
    googleApiKey: typeof settings?.googleApiKey === 'string' ? settings.googleApiKey.trim() : '',
    cerebrasApiKey: typeof settings?.cerebrasApiKey === 'string' ? settings.cerebrasApiKey.trim() : '',
    mistralApiKey: typeof settings?.mistralApiKey === 'string' ? settings.mistralApiKey.trim() : '',
    groqApiKey: typeof settings?.groqApiKey === 'string' ? settings.groqApiKey.trim() : '',
    sambanovaApiKey: typeof settings?.sambanovaApiKey === 'string' ? settings.sambanovaApiKey.trim() : '',
    zaiApiKey: typeof settings?.zaiApiKey === 'string' ? settings.zaiApiKey.trim() : '',
    openrouterApiKey: typeof settings?.openrouterApiKey === 'string' ? settings.openrouterApiKey.trim() : '',
  };
}

function normalizeResumeVersion(version: unknown): ResumeVersion | null {
  if (!version || typeof version !== 'object') {
    return null;
  }

  const record = version as Partial<ResumeVersion>;
  const data = isResumeData(record.data) || isCoverLetterData(record.data) ? record.data : null;

  if (!data || typeof record.id !== 'string' || typeof record.name !== 'string') {
    return null;
  }

  return {
    id: record.id,
    name: record.name,
    timestamp: typeof record.timestamp === 'number' ? record.timestamp : Date.now(),
    data,
    type: normalizeVersionType(record.type),
    documentLayout: record.documentLayout === 'single-page' ? 'single-page' : undefined,
    companyName: typeof record.companyName === 'string' ? record.companyName : undefined,
    companyShortName: typeof record.companyShortName === 'string' ? record.companyShortName : undefined,
    jobTitle: typeof record.jobTitle === 'string' ? record.jobTitle : undefined,
    atsKeywords: normalizeStringArray(record.atsKeywords),
    model: typeof record.model === 'string' ? record.model : undefined,
    changes: normalizeStringArray(record.changes),
    alignmentScore: typeof record.alignmentScore === 'number' ? record.alignmentScore : undefined,
    alignmentDetails: record.alignmentDetails && typeof record.alignmentDetails === 'object'
      ? {
          matchingPoints: normalizeStringArray(record.alignmentDetails.matchingPoints),
          missingPoints: normalizeStringArray(record.alignmentDetails.missingPoints),
        }
      : undefined,
    proofMap: Array.isArray(record.proofMap) ? record.proofMap : [],
  };
}

function normalizeVersions(value: unknown): ResumeVersion[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeResumeVersion)
    .filter((version): version is ResumeVersion => version !== null);
}

function normalizeEditLogs(value: unknown): ResumeEditLog[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap(log => {
    if (!log || typeof log !== 'object') {
      return [];
    }

    const record = log as Partial<ResumeEditLog>;
    if (typeof record.id !== 'string' || typeof record.description !== 'string' || !isResumeData(record.previousData)) {
      return [];
    }

    return [{
      id: record.id,
      timestamp: typeof record.timestamp === 'number' ? record.timestamp : Date.now(),
      description: record.description,
      previousData: record.previousData,
    }];
  });
}

export function normalizePersistedState(value: unknown): PersistedAppState | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const record = value as Partial<PersistedAppState>;
  const versions = normalizeVersions(record.versions);

  return {
    schemaVersion: APP_STORAGE_SCHEMA_VERSION,
    savedAt: typeof record.savedAt === 'string' ? record.savedAt : new Date().toISOString(),
    resumeInput: typeof record.resumeInput === 'string' ? record.resumeInput : '',
    jobDescription: typeof record.jobDescription === 'string' ? record.jobDescription : '',
    generatedResume: isResumeData(record.generatedResume) ? record.generatedResume : null,
    generatedCoverLetter: isCoverLetterData(record.generatedCoverLetter) ? record.generatedCoverLetter : null,
    atsKeywords: normalizeStringArray(record.atsKeywords),
    atsEnabled: Boolean(record.atsEnabled),
    settings: sanitizeSettings(record.settings),
    activeTab: normalizeActiveTab(record.activeTab),
    versions,
    currentVersionId: typeof record.currentVersionId === 'string' ? record.currentVersionId : versions[0]?.id ?? null,
    isResumeCollapsed: Boolean(record.isResumeCollapsed),
    resumeFormat: normalizeResumeFormat(record.resumeFormat),
    editLogs: normalizeEditLogs(record.editLogs),
  };
}

export function buildPersistedAppState(params: {
  resumeInput: string;
  jobDescription: string;
  generatedResume: ResumeData | null;
  generatedCoverLetter: CoverLetterData | null;
  atsKeywords: string[];
  atsEnabled: boolean;
  settings: AISettings;
  activeTab: AppTab;
  versions: ResumeVersion[];
  currentVersionId: string | null;
  isResumeCollapsed: boolean;
  resumeFormat: ResumeFormat;
  editLogs: ResumeEditLog[];
}): PersistedAppState {
  return {
    schemaVersion: APP_STORAGE_SCHEMA_VERSION,
    savedAt: new Date().toISOString(),
    resumeInput: params.resumeInput,
    jobDescription: params.jobDescription,
    generatedResume: params.generatedResume,
    generatedCoverLetter: params.generatedCoverLetter,
    atsKeywords: params.atsKeywords,
    atsEnabled: params.atsEnabled,
    settings: sanitizeSettings(params.settings),
    activeTab: params.activeTab,
    versions: params.versions,
    currentVersionId: params.currentVersionId,
    isResumeCollapsed: params.isResumeCollapsed,
    resumeFormat: params.resumeFormat,
    editLogs: params.editLogs,
  };
}

export function deriveVersionSelection(version: ResumeVersion | null): VersionSelectionState {
  if (!version) {
    return {
      currentVersion: null,
      generatedResume: null,
      generatedCoverLetter: null,
      atsKeywords: [],
      activeTab: 'input',
    };
  }

  if (version.type === 'cover-letter' && isCoverLetterData(version.data)) {
    return {
      currentVersion: version,
      generatedResume: null,
      generatedCoverLetter: version.data,
      atsKeywords: normalizeStringArray(version.atsKeywords),
      activeTab: 'preview',
    };
  }

  if (isResumeData(version.data)) {
    return {
      currentVersion: version,
      generatedResume: version.data,
      generatedCoverLetter: null,
      atsKeywords: normalizeStringArray(version.atsKeywords),
      activeTab: 'preview',
    };
  }

  return {
    currentVersion: version,
    generatedResume: null,
    generatedCoverLetter: null,
    atsKeywords: [],
    activeTab: 'input',
  };
}

export function restorePersistedSession(state: PersistedAppState): RestoredAppSession {
  let currentVersion = state.currentVersionId
    ? state.versions.find(version => version.id === state.currentVersionId) ?? null
    : null;
  let generatedResume = state.generatedResume;
  let generatedCoverLetter = state.generatedCoverLetter;

  if (!currentVersion && !generatedResume && !generatedCoverLetter && state.versions.length > 0) {
    currentVersion = state.versions[0];
  }

  if (currentVersion) {
    const derivedState = deriveVersionSelection(currentVersion);
    generatedResume = generatedResume ?? derivedState.generatedResume;
    generatedCoverLetter = generatedCoverLetter ?? derivedState.generatedCoverLetter;
  }

  // Never restore a collapsed state for an empty box — that's the UX bug
  // where the user sees a collapsed input with no way to open it (or it looks stuck)
  const isResumeCollapsed = state.isResumeCollapsed && state.resumeInput.trim().length > 0;

  return {
    resumeInput: state.resumeInput,
    jobDescription: state.jobDescription,
    generatedResume,
    generatedCoverLetter,
    atsKeywords: currentVersion ? normalizeStringArray(currentVersion.atsKeywords) : state.atsKeywords,
    atsEnabled: state.atsEnabled,
    settings: state.settings,
    activeTab: state.activeTab === 'preview' && (generatedResume || generatedCoverLetter) ? 'preview' : 'input',
    versions: state.versions,
    currentVersion,
    isResumeCollapsed,
    resumeFormat: state.resumeFormat,
    editLogs: state.editLogs,
  };
}

export function resolveDeletedVersionState(params: {
  versions: ResumeVersion[];
  currentVersionId: string | null;
  deleteId: string;
}): VersionSelectionState & { versions: ResumeVersion[] } {
  const versions = params.versions.filter(version => version.id !== params.deleteId);

  if (params.currentVersionId !== params.deleteId) {
    const currentVersion = params.currentVersionId
      ? versions.find(version => version.id === params.currentVersionId) ?? null
      : null;

    return {
      versions,
      ...deriveVersionSelection(currentVersion),
    };
  }

  return {
    versions,
    ...deriveVersionSelection(versions[0] ?? null),
  };
}

export function resolveRevertedEditState(params: {
  generatedResume: ResumeData | null;
  editLogs: ResumeEditLog[];
  revertId: string;
}): { generatedResume: ResumeData | null; editLogs: ResumeEditLog[] } {
  const targetLog = params.editLogs.find(log => log.id === params.revertId);
  if (!targetLog) {
    return {
      generatedResume: params.generatedResume,
      editLogs: params.editLogs,
    };
  }

  const targetIndex = params.editLogs.findIndex(log => log.id === params.revertId);

  return {
    generatedResume: targetLog.previousData,
    editLogs: targetIndex >= 0 ? params.editLogs.slice(targetIndex + 1) : params.editLogs,
  };
}

export function resolveAppliedEditState(params: {
  generatedResume: ResumeData | null;
  editLogs: ResumeEditLog[];
  nextData: ResumeData;
  description: string;
}): { generatedResume: ResumeData | null; editLogs: ResumeEditLog[] } {
  if (!params.generatedResume) {
    return {
      generatedResume: params.generatedResume,
      editLogs: params.editLogs,
    };
  }

  return {
    generatedResume: params.nextData,
    editLogs: [{
      id: generateId(),
      timestamp: Date.now(),
      description: params.description,
      previousData: params.generatedResume,
    }, ...params.editLogs],
  };
}

export function deriveSaveHealthStatus(results: StorageWriteResult[]): SaveHealthStatus {
  return results.every(result => result.ok) ? 'saved' : 'backup_recommended';
}
