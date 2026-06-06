import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import type { ResumeData, CoverLetterData, AISettings, ResumeVersion, ResumeFormat, ResumeEditLog } from './types';
import {
  DEFAULT_SETTINGS, generateId, APP_CONSTANTS,
  GOOGLE_MODELS, CEREBRAS_MODELS, MISTRAL_MODELS, GROQ_MODELS,
  SAMBANOVA_MODELS, ZAI_MODELS, OPENROUTER_MODELS,
  PROVIDER_MODELS_MAP, PROVIDER_MODEL_KEY, PROVIDER_META,
} from './types';
import { generateBaseResume, generateTailoredResume, generateCoverLetter, generateSinglePageResume, extractATSKeywords } from './services/aiService';
import { ResumeTemplate } from './components/ResumeTemplate';
import { ResumeTemplateModern } from './components/ResumeTemplateModern';
import { ResumeTemplateExecutive } from './components/ResumeTemplateExecutive';

import { CoverLetterTemplate } from './components/CoverLetterTemplate';
import { CoverLetterTemplateModern } from './components/CoverLetterTemplateModern';
import { CoverLetterTemplateExecutive } from './components/CoverLetterTemplateExecutive';
import { SettingsModal } from './components/SettingsModal';
import { ChangesView } from './components/ChangesView';
import { ProofMapPanel } from './components/ProofMapPanel';
import { getScoreColor } from './utils/scoreUtils';

import { ErrorBoundary } from './components/ErrorBoundary';
import { ConfirmModal } from './components/ConfirmModal';
import { SkeletonResume } from './components/SkeletonResume';
import { QuickEditModal } from './components/QuickEditModal';
import { EditHistoryPanel } from './components/EditHistoryPanel';
import { HomeModal } from './components/HomeModal';
import { ResumeTemplateCompact } from './components/ResumeTemplateCompact';
import type { ResumeEditBlock, ResumeCanvasEditingProps } from './components/ResumeCanvasEditor';
import { WelcomeModal } from './components/WelcomeModal';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMobileKeyboardGuard } from './hooks/useMobileKeyboardGuard';
import { useDebounce } from './hooks/useDebounce';
import { ResumeProvider, SettingsProvider, UIProvider, useResume, useSettings, useUI } from './contexts';
import {
  STORAGE_KEYS,
  getStorageItem,
  getStorageString,
  setStorageItemDetailed,
  setStorageString,
  setStorageStringDetailed,
  removeStorageItem,
  type StorageWriteResult,
} from './utils/storage';
import {
  APP_STORAGE_SCHEMA_VERSION,
  buildPersistedAppState,
  deriveSaveHealthStatus,
  deriveVersionSelection,
  normalizePersistedState,
  resolveAppliedEditState,
  resolveDeletedVersionState,
  resolveRevertedEditState,
  restorePersistedSession,
  sanitizeSettings,
  type AppTab,
  type PersistedAppState,
  type SaveHealthStatus,
} from './utils/persistence';
import {
  cleanResumeEditLogs,
  cleanResumeVersion,
  cleanResumeVersions,
  cleanResumeData,
  cleanCoverLetterData,
  sanitizeFilePart,
  cleanAIText,
} from './utils/documentData';

import './App.css';
import './components/Executive.css';
import { LandingPage } from './components/LandingPage';

// ── Suppress unused-import warnings (arrays used via PROVIDER_MODELS_MAP) ──
void GOOGLE_MODELS; void CEREBRAS_MODELS; void MISTRAL_MODELS;
void GROQ_MODELS; void SAMBANOVA_MODELS; void ZAI_MODELS; void OPENROUTER_MODELS;

function buildPdfFileName(
  settings: AISettings,
  generatedResume: ResumeData | null,
  generatedCoverLetter: CoverLetterData | null,
  currentVersion: ResumeVersion | null
): string {
  const genericCompanyValues = new Set(['general', 'company', 'target company', 'unknown company', 'hiring team']);
  const genericRoleValues = new Set(['professional profile', 'position', 'role', 'target role', 'resume', 'cv']);
  const getSpecificFilePart = (value: string | undefined, genericValues: Set<string>) => {
    const cleaned = cleanAIText(value ?? '').trim();
    if (!cleaned || genericValues.has(cleaned.toLowerCase())) return '';
    return sanitizeFilePart(cleaned);
  };
  const namePart = sanitizeFilePart(
    settings.userName || generatedResume?.fullName || generatedCoverLetter?.fullName || currentVersion?.data?.fullName || 'Candidate'
  );
  const companyPart = getSpecificFilePart(currentVersion?.companyName, genericCompanyValues);
  const rolePart = getSpecificFilePart(currentVersion?.jobTitle, genericRoleValues);
  const suffix = [companyPart, rolePart].filter(Boolean).join('_');

  if (currentVersion?.type === 'tailored') {
    return suffix ? `${namePart}_Resume_${suffix}` : `${namePart}_Resume_Target_Company_Target_Role`;
  }
  if (currentVersion?.type === 'cover-letter') {
    return suffix ? `${namePart}_Cover_Letter_${suffix}` : `${namePart}_Cover_Letter`;
  }
  if (currentVersion?.type === 'cv') {
    return suffix ? `${namePart}_CV_${suffix}` : `${namePart}_CV`;
  }
  if (currentVersion?.documentLayout === 'single-page') {
    return suffix ? `${namePart}_Resume_${suffix}_One_Page` : `${namePart}_Resume_One_Page`;
  }
  if (currentVersion?.type === 'fixed') return `${namePart}_Resume`;
  return `${namePart}_Resume`;
}

const GENERIC_NAME_VALUES = new Set([
  '',
  'candidate',
  'candidate name',
  'full name',
  'name',
  'n/a',
  'na',
  'your name',
]);

function shouldUseProfileName(value: string | undefined): boolean {
  return GENERIC_NAME_VALUES.has(cleanAIText(value ?? '').trim().toLowerCase());
}

function applyProfileNameToResume(data: ResumeData, userName: string): ResumeData {
  const cleanName = cleanAIText(userName).trim();
  if (!cleanName || !shouldUseProfileName(data.fullName)) return data;
  return { ...data, fullName: cleanName };
}

function applyProfileNameToCoverLetter(data: CoverLetterData, userName: string): CoverLetterData {
  const cleanName = cleanAIText(userName).trim();
  if (!cleanName) return data;

  const fullName = shouldUseProfileName(data.fullName) ? cleanName : data.fullName;
  const signatureName = shouldUseProfileName(data.signatureName) ? fullName : data.signatureName;

  return { ...data, fullName, signatureName };
}

function buildLegacyState(fallbackState: PersistedAppState | null): PersistedAppState {
  const fallbackVersions = Array.isArray(fallbackState?.versions) ? fallbackState.versions : [];
  const fallbackLogs = Array.isArray(fallbackState?.editLogs) ? fallbackState.editLogs : [];
  const versions = normalizePersistedState({ versions: getStorageItem<ResumeVersion[]>(STORAGE_KEYS.VERSIONS, fallbackVersions) })?.versions ?? [];
  const editLogs = normalizePersistedState({ editLogs: getStorageItem<ResumeEditLog[]>(STORAGE_KEYS.EDIT_LOGS, fallbackLogs) })?.editLogs ?? [];

  return {
    schemaVersion: APP_STORAGE_SCHEMA_VERSION,
    savedAt: fallbackState?.savedAt ?? new Date().toISOString(),
    resumeInput: getStorageString(STORAGE_KEYS.RESUME_DATA, fallbackState?.resumeInput ?? ''),
    jobDescription: getStorageString(STORAGE_KEYS.JOB_DESCRIPTION, fallbackState?.jobDescription ?? ''),
    generatedResume: fallbackState?.generatedResume ?? null,
    generatedCoverLetter: fallbackState?.generatedCoverLetter ?? null,
    atsKeywords: fallbackState?.atsKeywords ?? [],
    atsEnabled: fallbackState?.atsEnabled ?? false,
    settings: sanitizeSettings(getStorageItem<Partial<AISettings>>(STORAGE_KEYS.SETTINGS, fallbackState?.settings ?? DEFAULT_SETTINGS)),
    activeTab: fallbackState?.activeTab ?? 'input',
    versions,
    currentVersionId: fallbackState?.currentVersionId ?? versions[0]?.id ?? null,
    isResumeCollapsed: getStorageString(
      STORAGE_KEYS.RESUME_COLLAPSED,
      fallbackState?.isResumeCollapsed ? 'true' : 'false'
    ) === 'true',
    resumeFormat: (() => {
      const stored = getStorageString(STORAGE_KEYS.RESUME_FORMAT, fallbackState?.resumeFormat ?? 'classic');
      return stored === 'modern' ? 'modern' : stored === 'executive' ? 'executive' : 'classic';
    })(),
    editLogs,
  };
}

function formatSavedTime(savedAt: string | null): string | null {
  if (!savedAt) return null;
  const date = new Date(savedAt);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getSaveHealthCopy(status: SaveHealthStatus, lastSavedAt: string | null) {
  const savedTime = formatSavedTime(lastSavedAt);
  switch (status) {
    case 'saving':
      return { label: 'saving', compactLabel: 'saving...', detail: 'Persisting your latest changes.' };
    case 'backup_recommended':
      return { label: 'backup recommended', compactLabel: 'backup recommended', detail: 'Storage is full or unavailable. Export a backup from Settings.' };
    default:
      return {
        label: 'saved',
        compactLabel: savedTime ? `saved ${savedTime}` : 'saved locally',
        detail: savedTime ? `Last saved at ${savedTime}.` : 'All changes are stored locally.',
      };
  }
}

function isSinglePageResumeVersion(version: ResumeVersion | null): boolean {
  if (!version) return false;
  if (version.documentLayout === 'single-page') return true;

  return version.type === 'base'
    && !!(version.companyName || version.jobTitle)
    && Array.isArray(version.changes)
    && version.changes.length > 0;
}

function getVersionTypeInfo(version: ResumeVersion) {
  if (isSinglePageResumeVersion(version)) {
    return { marker: '1P', label: 'One Page', color: '#38bdf8' };
  }
  if (version.type === 'cover-letter') return { marker: 'CL', label: 'Cover Letter', color: '#c26b2d' };
  if (version.type === 'tailored') return { marker: 'T', label: 'Tailored', color: '#3b9eff' };
  if (version.type === 'fixed') return { marker: 'F', label: 'Fixed', color: '#22c55e' };
  if (version.type === 'cv') return { marker: 'CV', label: 'CV', color: '#0f766e' };
  return { marker: 'R', label: 'Resume', color: '#a78bfa' };
}

function formatVersionAge(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';

  const now = new Date();
  const diffMin = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;

  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getPersistenceSignature(state: Omit<PersistedAppState, 'savedAt'>): string {
  return JSON.stringify(state);
}

function getPersistedStateSignature(state: PersistedAppState): string {
  const { savedAt: _savedAt, ...signatureState } = state;
  void _savedAt;
  return getPersistenceSignature(signatureState);
}

// ── Quick Provider Switcher ──────────────────────────────────────────────────

interface QuickProviderSwitcherProps {
  settings: AISettings;
  onChangeProvider: (provider: AISettings['provider']) => void;
  onChangeModel: (model: string) => void;
  onOpenSettings: () => void;
  onClose: () => void;
}

function QuickProviderSwitcher({
  settings,
  onChangeProvider,
  onChangeModel,
  onOpenSettings,
  onClose,
}: QuickProviderSwitcherProps) {
  const models = PROVIDER_MODELS_MAP[settings.provider];
  const currentModel = settings[PROVIDER_MODEL_KEY[settings.provider]] as string;

  return (
    <div className="qps-panel">
      <div className="qps-header">
        <span className="qps-title">AI Provider</span>
        <button className="qps-close" onClick={onClose} aria-label="Close">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>

      {/* Provider chips */}
      <div className="qps-providers">
        {PROVIDER_META.map(p => (
          <button
            key={p.id}
            className={`qps-chip ${settings.provider === p.id ? 'active' : ''}`}
            onClick={() => onChangeProvider(p.id)}
            title={p.label}
          >
            <img src={p.icon} alt={p.label} className="qps-chip-icon" />
            <span className="qps-chip-label">{p.label}</span>
          </button>
        ))}
      </div>

      {/* Model selector */}
      <div className="qps-model-row">
        <label className="qps-model-label">Model</label>
        <select
          className="qps-model-select"
          value={currentModel}
          onChange={e => onChangeModel(e.target.value)}
        >
          {models.map(m => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>

      <button className="qps-settings-link" onClick={onOpenSettings}>
        Full Settings
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
        </svg>
      </button>
    </div>
  );
}

// ── Context Providers ────────────────────────────────────────────────────────

function AppProviders({ children }: { children: ReactNode }) {
  const [resumeInput, setResumeInput] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [generatedResume, setGeneratedResume] = useState<ResumeData | null>(null);
  const [generatedCoverLetter, setGeneratedCoverLetter] = useState<CoverLetterData | null>(null);
  const [atsKeywords, setAtsKeywords] = useState<string[]>([]);
  const [atsEnabled, setAtsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [error, setError] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showHome, setShowHome] = useState(false);
  const [settings, setSettings] = useState<AISettings>(DEFAULT_SETTINGS);
  const [activeTab, setActiveTab] = useState<AppTab>('input');
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<ResumeVersion | null>(null);
  const [showChanges, setShowChanges] = useState(false);
  const [showProofMap, setShowProofMap] = useState(false);
  const [isResumeCollapsed, setIsResumeCollapsed] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [resumeFormat, setResumeFormat] = useState<ResumeFormat>('classic');
  const [showQuickEdit, setShowQuickEdit] = useState(false);
  const [editLogs, setEditLogs] = useState<ResumeEditLog[]>([]);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [showLanding, setShowLanding] = useState(true);
  const [hasHydrated, setHasHydrated] = useState(false);
  const [saveHealthStatus, setSaveHealthStatus] = useState<SaveHealthStatus>('saved');
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const resumeValue = useMemo(() => ({
    resumeInput, setResumeInput,
    jobDescription, setJobDescription,
    generatedResume, setGeneratedResume,
    generatedCoverLetter, setGeneratedCoverLetter,
    atsKeywords, setAtsKeywords,
    atsEnabled, setAtsEnabled,
    versions, setVersions,
    currentVersion, setCurrentVersion,
    resumeFormat, setResumeFormat,
    editLogs, setEditLogs,
  }), [resumeInput, jobDescription, generatedResume, generatedCoverLetter, atsKeywords, atsEnabled, versions, currentVersion, resumeFormat, editLogs]);

  const settingsValue = useMemo(() => ({ settings, setSettings }), [settings]);

  const uiValue = useMemo(() => ({
    isLoading, setIsLoading,
    loadingMessage, setLoadingMessage,
    error, setError,
    showSettings, setShowSettings,
    showHome, setShowHome,
    activeTab, setActiveTab,
    showChanges, setShowChanges,
    showProofMap, setShowProofMap,
    isResumeCollapsed, setIsResumeCollapsed,
    showClearConfirm, setShowClearConfirm,
    showQuickEdit, setShowQuickEdit,
    showEditHistory, setShowEditHistory,
    showLanding, setShowLanding,
    hasHydrated, setHasHydrated,
    saveHealthStatus, setSaveHealthStatus,
    lastSavedAt, setLastSavedAt,
  }), [
    isLoading, loadingMessage, error, showSettings, showHome, activeTab,
    showChanges, showProofMap, isResumeCollapsed, showClearConfirm, showQuickEdit,
    showEditHistory, showLanding, hasHydrated, saveHealthStatus, lastSavedAt,
  ]);

  return (
    <ResumeProvider value={resumeValue}>
      <SettingsProvider value={settingsValue}>
        <UIProvider value={uiValue}>
          {children}
        </UIProvider>
      </SettingsProvider>
    </ResumeProvider>
  );
}

// ── Main App Content ─────────────────────────────────────────────────────────

function AppContent() {
  const {
    resumeInput, setResumeInput,
    jobDescription, setJobDescription,
    generatedResume, setGeneratedResume,
    generatedCoverLetter, setGeneratedCoverLetter,
    atsKeywords, setAtsKeywords,
    atsEnabled, setAtsEnabled,
    versions, setVersions,
    currentVersion, setCurrentVersion,
    resumeFormat, setResumeFormat,
    editLogs, setEditLogs,
  } = useResume();

  const { settings, setSettings } = useSettings();

  const {
    isLoading, setIsLoading,
    loadingMessage, setLoadingMessage,
    error, setError,
    showSettings, setShowSettings,
    showHome, setShowHome,
    activeTab, setActiveTab,
    showChanges, setShowChanges,
    showProofMap, setShowProofMap,
    isResumeCollapsed, setIsResumeCollapsed,
    showClearConfirm, setShowClearConfirm,
    showQuickEdit, setShowQuickEdit,
    showEditHistory, setShowEditHistory,
    showLanding, setShowLanding,
    hasHydrated, setHasHydrated,
    saveHealthStatus, setSaveHealthStatus,
    lastSavedAt, setLastSavedAt,
  } = useUI();

  // Quick provider switcher
  const [showQuickProvider, setShowQuickProvider] = useState(false);
  const qpsRef = useRef<HTMLDivElement>(null);

  // Single-page mode: separate from format so the 1-page tab never shows on regular resumes
  const [isSinglePageMode, setIsSinglePageMode] = useState(false);
  const [activeCanvasEditBlock, setActiveCanvasEditBlock] = useState<ResumeEditBlock | null>(null);

  // Sidebar scroll ref (for fade mask)
  const sidebarDataRef = useRef<HTMLDivElement>(null);

  // New state for welcome name prompt
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showDeleteDocsConfirm, setShowDeleteDocsConfirm] = useState(false);


  useEffect(() => {
    if (!showQuickProvider) return;
    const handler = (e: MouseEvent) => {
      if (qpsRef.current && !qpsRef.current.contains(e.target as Node)) {
        setShowQuickProvider(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showQuickProvider]);

  const handleQuickProviderChange = useCallback((provider: AISettings['provider']) => {
    setSettings(prev => ({ ...prev, provider }));
  }, [setSettings]);

  const handleQuickModelChange = useCallback((model: string) => {
    setSettings(prev => ({ ...prev, [PROVIDER_MODEL_KEY[prev.provider]]: model }));
  }, [setSettings]);

  // Persistence
  const lastPersistedSignatureRef = useRef<string | null>(null);
  const requestLockRef = useRef(false);

  const persistencePayload = useMemo(() => ({
    schemaVersion: APP_STORAGE_SCHEMA_VERSION,
    resumeInput, jobDescription, generatedResume, generatedCoverLetter,
    atsKeywords, atsEnabled, settings, activeTab, versions,
    currentVersionId: currentVersion?.id ?? null,
    isResumeCollapsed, resumeFormat, editLogs,
  }), [
    resumeInput, jobDescription, generatedResume, generatedCoverLetter,
    atsKeywords, atsEnabled, settings, activeTab, versions,
    currentVersion, isResumeCollapsed, resumeFormat, editLogs,
  ]);

  const debouncedPersistencePayload = useDebounce(persistencePayload, APP_CONSTANTS.DEBOUNCE_DELAY_MS);
  const hasPendingPersistence = getPersistenceSignature(persistencePayload) !== getPersistenceSignature(debouncedPersistencePayload);
  const displayedSaveHealthStatus: SaveHealthStatus =
    saveHealthStatus === 'backup_recommended' ? 'backup_recommended'
    : hasPendingPersistence ? 'saving'
    : saveHealthStatus;
  const saveHealthCopy = getSaveHealthCopy(displayedSaveHealthStatus, lastSavedAt);

  useMobileKeyboardGuard();

  const applyRestoredSession = useCallback((restoredSession: ReturnType<typeof restorePersistedSession>) => {
    setResumeInput(restoredSession.resumeInput);
    setJobDescription(restoredSession.jobDescription);
    setGeneratedResume(restoredSession.generatedResume ? cleanResumeData(restoredSession.generatedResume) : null);
    setGeneratedCoverLetter(restoredSession.generatedCoverLetter ? cleanCoverLetterData(restoredSession.generatedCoverLetter) : null);
    setAtsKeywords(restoredSession.atsKeywords);
    setAtsEnabled(restoredSession.atsEnabled);
    setSettings(restoredSession.settings);
    setActiveTab(restoredSession.activeTab);
    setVersions(cleanResumeVersions(restoredSession.versions));
    setCurrentVersion(restoredSession.currentVersion ? cleanResumeVersion(restoredSession.currentVersion) : null);
    setIsResumeCollapsed(restoredSession.isResumeCollapsed);
    setResumeFormat(restoredSession.resumeFormat);
    setIsSinglePageMode(isSinglePageResumeVersion(restoredSession.currentVersion));
    setEditLogs(cleanResumeEditLogs(restoredSession.editLogs));
  }, [
    setResumeInput, setJobDescription, setGeneratedResume, setGeneratedCoverLetter,
    setAtsKeywords, setAtsEnabled, setSettings, setActiveTab, setVersions,
    setCurrentVersion, setIsResumeCollapsed, setResumeFormat, setEditLogs,
  ]);

  useEffect(() => {
    const snapshot = normalizePersistedState(getStorageItem<PersistedAppState | null>(STORAGE_KEYS.APP_STATE, null));
    const backupState = normalizePersistedState(getStorageItem<PersistedAppState | null>(STORAGE_KEYS.APP_STATE_BACKUP, null));
    const restoredState = snapshot ?? buildLegacyState(backupState);
    const restoredSession = restorePersistedSession(restoredState);

    applyRestoredSession(restoredSession);
    setShowLanding(getStorageString(STORAGE_KEYS.VISITED, '') !== '1');
    
    // Show welcome modal if name is empty and they've already "visited" or just skipped landing
    if (!restoredSession.settings.userName.trim() && getStorageString(STORAGE_KEYS.VISITED, '') === '1') {
      setShowWelcomeModal(true);
    }
    
    setLastSavedAt(snapshot?.savedAt ?? backupState?.savedAt ?? null);
    setSaveHealthStatus('saved');
    lastPersistedSignatureRef.current = getPersistedStateSignature(restoredState);
    setHasHydrated(true);
  }, [applyRestoredSession, setHasHydrated, setLastSavedAt, setSaveHealthStatus, setShowLanding]);

  useEffect(() => {
    if (!hasHydrated) return;
    const nextSignature = getPersistenceSignature(debouncedPersistencePayload);
    if (lastPersistedSignatureRef.current === nextSignature) {
      setSaveHealthStatus(cur => (cur === 'backup_recommended' ? cur : 'saved'));
      return;
    }
    const snapshot = buildPersistedAppState(debouncedPersistencePayload);
    const backupSnapshot: Partial<PersistedAppState> = {
      schemaVersion: snapshot.schemaVersion, savedAt: snapshot.savedAt,
      resumeInput: snapshot.resumeInput, jobDescription: snapshot.jobDescription,
      generatedResume: snapshot.generatedResume, generatedCoverLetter: snapshot.generatedCoverLetter,
      atsKeywords: snapshot.atsKeywords, atsEnabled: snapshot.atsEnabled,
      settings: snapshot.settings, activeTab: snapshot.activeTab,
      currentVersionId: snapshot.currentVersionId, isResumeCollapsed: snapshot.isResumeCollapsed,
      resumeFormat: snapshot.resumeFormat,
    };
    const writeResults: StorageWriteResult[] = [
      setStorageStringDetailed(STORAGE_KEYS.RESUME_DATA, debouncedPersistencePayload.resumeInput),
      setStorageStringDetailed(STORAGE_KEYS.JOB_DESCRIPTION, debouncedPersistencePayload.jobDescription),
      setStorageItemDetailed(STORAGE_KEYS.SETTINGS, snapshot.settings),
      setStorageItemDetailed(STORAGE_KEYS.VERSIONS, debouncedPersistencePayload.versions),
      setStorageItemDetailed(STORAGE_KEYS.EDIT_LOGS, debouncedPersistencePayload.editLogs),
      setStorageStringDetailed(STORAGE_KEYS.RESUME_COLLAPSED, String(debouncedPersistencePayload.isResumeCollapsed)),
      setStorageStringDetailed(STORAGE_KEYS.RESUME_FORMAT, debouncedPersistencePayload.resumeFormat),
      setStorageStringDetailed(STORAGE_KEYS.VISITED, showLanding ? '0' : '1'),
      setStorageItemDetailed(STORAGE_KEYS.APP_STATE, snapshot),
      setStorageItemDetailed(STORAGE_KEYS.APP_STATE_BACKUP, backupSnapshot),
    ];
    const nextSaveHealthStatus = deriveSaveHealthStatus(writeResults);
    setSaveHealthStatus(nextSaveHealthStatus);
    if (nextSaveHealthStatus === 'saved') {
      lastPersistedSignatureRef.current = nextSignature;
      setLastSavedAt(snapshot.savedAt);
    }
  }, [hasHydrated, debouncedPersistencePayload, showLanding, setLastSavedAt, setSaveHealthStatus]);

  const handleSaveSettings = useCallback((newSettings: AISettings) => {
    setSettings(sanitizeSettings(newSettings));
  }, [setSettings]);

  const validateSettings = (): boolean => {
    const keyMap: Record<AISettings['provider'], { key: keyof AISettings; label: string }> = {
      google:     { key: 'googleApiKey',     label: 'Google AI' },
      cerebras:   { key: 'cerebrasApiKey',   label: 'Cerebras' },
      mistral:    { key: 'mistralApiKey',     label: 'Mistral' },
      groq:       { key: 'groqApiKey',        label: 'Groq' },
      sambanova:  { key: 'sambanovaApiKey',   label: 'SambaNova' },
      zai:        { key: 'zaiApiKey',          label: 'Z.AI' },
      openrouter: { key: 'openrouterApiKey',  label: 'OpenRouter' },
    };
    const cfg = keyMap[settings.provider];
    if (!settings[cfg.key]) {
      setError(`Please configure your ${cfg.label} API key in Settings`);
      return false;
    }
    return true;
  };

  const getModelUsed = () => settings[PROVIDER_MODEL_KEY[settings.provider]] as string | undefined;

  const getProviderLabel = () => PROVIDER_META.find(p => p.id === settings.provider)?.label ?? settings.provider;

  const saveVersion = (
    data: ResumeData | CoverLetterData,
    type: 'base' | 'tailored' | 'fixed' | 'cover-letter' | 'cv',
    companyName?: string,
    companyShortName?: string,
    jobTitle?: string,
    changes?: string[],
    keywords?: string[],
    alignmentScore?: number,
    alignmentDetails?: { matchingPoints: string[]; missingPoints: string[] },
    model?: string,
    proofMap?: ResumeVersion['proofMap'],
    documentLayout?: ResumeVersion['documentLayout'],
    sourceJobDescription?: string
  ) => {
    let name = 'Base Resume';
    if (documentLayout === 'single-page' && companyName) name = `${companyName} - ${jobTitle || 'Resume'} One Page`;
    else if (documentLayout === 'single-page') name = 'Single Page Resume';
    else if (type === 'tailored' && companyName) name = `${companyName} - ${jobTitle || 'Position'}`;
    else if (type === 'cover-letter' && companyName) name = `${companyName} - ${jobTitle || 'Role'} Cover Letter`;
    else if (type === 'cover-letter') name = 'Professional Cover Letter';
    else if (type === 'cv' && companyName) name = `${companyName} - ${jobTitle || 'CV'} CV`;
    else if (type === 'cv') name = 'Professional CV';
    else if (type === 'fixed') name = 'Fixed Resume';

    const version: ResumeVersion = {
      id: generateId(), name, timestamp: Date.now(), data, type,
      documentLayout,
      companyName, companyShortName, jobTitle,
      jobDescription: (sourceJobDescription ?? jobDescription).trim() || undefined,
      atsKeywords: keywords,
      changes, alignmentScore, alignmentDetails, proofMap, model,
    };
    setVersions(prev => [version, ...prev.slice(0, APP_CONSTANTS.MAX_VERSIONS - 1)]);
    setCurrentVersion(version);
    setEditLogs([]);
  };

  const beginLoadingRequest = useCallback((message: string) => {
    if (requestLockRef.current) return false;
    requestLockRef.current = true;
    setError(''); setIsLoading(true); setLoadingMessage(message);
    return true;
  }, [setError, setIsLoading, setLoadingMessage]);

  const finishLoadingRequest = useCallback(() => {
    requestLockRef.current = false;
    setIsLoading(false); setLoadingMessage('');
  }, [setIsLoading, setLoadingMessage]);

  const handleGenerateResume = async () => {
    if (!resumeInput.trim()) { setError('Please enter your resume information'); return; }
    if (!validateSettings()) return;
    if (!beginLoadingRequest('Analyzing your resume data...')) return;
    try {
      const resume = await generateBaseResume(resumeInput, settings);
      const cleanedResume = applyProfileNameToResume(cleanResumeData(resume), settings.userName);
      setGeneratedResume(cleanedResume); setGeneratedCoverLetter(null); setAtsKeywords([]);
      saveVersion(cleanedResume, 'base', undefined, undefined, undefined, undefined, undefined, undefined, undefined, getModelUsed());
      setIsSinglePageMode(false);
      setActiveTab('preview'); setShowChanges(false); setShowProofMap(false);
      setShowEditHistory(false); setShowQuickEdit(false); setActiveCanvasEditBlock(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate resume');
    } finally { finishLoadingRequest(); }
  };

  const handleGenerateTailoredResume = async () => {
    if (!resumeInput.trim()) { setError('Please enter your resume information'); return; }
    if (!jobDescription.trim()) { setError('Please enter a job description to tailor your resume'); return; }
    if (!validateSettings()) return;
    if (!beginLoadingRequest('Tailoring your resume for the job...')) return;
    try {
      const result = await generateTailoredResume(resumeInput, jobDescription, settings);
      const cleanedResume = applyProfileNameToResume(cleanResumeData(result.resume), settings.userName);
      setGeneratedResume(cleanedResume); setGeneratedCoverLetter(null);
      let keywords: string[] = [];
      if (atsEnabled) {
        setLoadingMessage('Extracting ATS keywords...');
        keywords = await extractATSKeywords(jobDescription, settings);
        setAtsKeywords(keywords);
      } else { setAtsKeywords([]); }
      saveVersion(cleanedResume, 'tailored', result.companyName, result.companyShortName, result.jobTitle,
        result.changes, keywords, result.alignmentScore, result.alignmentDetails, getModelUsed(), result.proofMap);
      setIsSinglePageMode(false);
      setActiveTab('preview'); setShowChanges(false); setShowProofMap(false);
      setShowEditHistory(false); setShowQuickEdit(false); setActiveCanvasEditBlock(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate tailored resume');
    } finally { finishLoadingRequest(); }
  };

  const handleGenerateSinglePage = async () => {
    if (!resumeInput.trim()) { setError('Please enter your resume information'); return; }
    if (!validateSettings()) return;
    const singlePageJobDescription = jobDescription.trim();
    if (!beginLoadingRequest(singlePageJobDescription ? 'Condensing and tuning your resume for the job...' : 'Condensing your resume to one page...')) return;
    try {
      const result = await generateSinglePageResume(resumeInput, singlePageJobDescription, settings);
      const cleanedResume = applyProfileNameToResume(cleanResumeData(result.resume), settings.userName);
      let keywords: string[] = [];
      if (singlePageJobDescription && atsEnabled) {
        setLoadingMessage('Extracting ATS keywords...');
        keywords = await extractATSKeywords(singlePageJobDescription, settings);
        setAtsKeywords(keywords);
      } else {
        setAtsKeywords([]);
      }
      setGeneratedResume(cleanedResume); setGeneratedCoverLetter(null);
      saveVersion(
        cleanedResume,
        'base',
        singlePageJobDescription ? result.companyName : undefined,
        singlePageJobDescription ? result.companyShortName : undefined,
        singlePageJobDescription ? result.jobTitle : undefined,
        result.changes,
        keywords,
        undefined,
        undefined,
        getModelUsed(),
        result.proofMap,
        'single-page',
        singlePageJobDescription
      );
      setIsSinglePageMode(true);
      setResumeFormat('classic'); // reset to classic sub-style
      setActiveTab('preview'); setShowChanges(false); setShowProofMap(false);
      setShowEditHistory(false); setShowQuickEdit(false); setActiveCanvasEditBlock(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate single-page resume');
    } finally { finishLoadingRequest(); }
  };

  const handleGenerateCoverLetter = async () => {
    if (!resumeInput.trim()) { setError('Please enter your resume information'); return; }
    if (!validateSettings()) return;
    if (!beginLoadingRequest(jobDescription.trim() ? 'Creating your job-focused cover letter...' : 'Creating your cover letter...')) return;
    try {
      const result = await generateCoverLetter(resumeInput, jobDescription, settings);
      const cleanedCL = applyProfileNameToCoverLetter(cleanCoverLetterData(result.coverLetter), settings.userName);
      setGeneratedResume(null); setGeneratedCoverLetter(cleanedCL); setAtsKeywords([]);
      saveVersion(cleanedCL, 'cover-letter', result.companyName, result.companyShortName, result.jobTitle,
        result.changes, [], undefined, undefined, getModelUsed(), result.proofMap);
      setIsSinglePageMode(false);
      setActiveTab('preview'); setShowChanges(false); setShowProofMap(false);
      setShowEditHistory(false); setShowQuickEdit(false); setActiveCanvasEditBlock(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cover letter');
    } finally { finishLoadingRequest(); }
  };

  const handleSelectVersion = (version: ResumeVersion) => {
    const derivedState = deriveVersionSelection(version);
    setGeneratedResume(derivedState.generatedResume);
    setGeneratedCoverLetter(derivedState.generatedCoverLetter);
    setCurrentVersion(derivedState.currentVersion);
    setAtsKeywords(derivedState.atsKeywords);
    setJobDescription(derivedState.jobDescription);
    setIsSinglePageMode(isSinglePageResumeVersion(version));
    setActiveTab(derivedState.activeTab);
    setShowChanges(!!(version.changes && version.changes.length > 0));
    setShowProofMap(false); setShowEditHistory(false); setShowQuickEdit(false); setActiveCanvasEditBlock(null);
    setEditLogs([]);
  };

  // Quick-nav: jump to a version in the preview panel with smooth scroll
  const handleQuickNavToVersion = (version: ResumeVersion) => {
    handleSelectVersion(version);
    setActiveTab('preview');
    requestAnimationFrame(() => {
      const el = document.getElementById('resume-cv-content');
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleDeleteVersion = (id: string) => {
    const resolvedState = resolveDeletedVersionState({ versions, currentVersionId: currentVersion?.id ?? null, deleteId: id });
    setVersions(resolvedState.versions);
    setCurrentVersion(resolvedState.currentVersion);
    setGeneratedResume(resolvedState.generatedResume);
    setGeneratedCoverLetter(resolvedState.generatedCoverLetter);
    setAtsKeywords(resolvedState.atsKeywords);
    setJobDescription(resolvedState.jobDescription);
    setIsSinglePageMode(isSinglePageResumeVersion(resolvedState.currentVersion));
    setActiveTab(resolvedState.activeTab);
    setShowChanges(false); setShowProofMap(false); setActiveCanvasEditBlock(null);
  };

  const handleDownloadPDF = () => {
    const seoTitle = document.title;
    const printStyleId = 'jobfit-print-page-setup';
    const existingPrintStyle = document.getElementById(printStyleId);
    existingPrintStyle?.remove();

    const printMargin = isSinglePageMode ? '6mm' : resumeFormat === 'modern' ? '10mm' : '0';
    const printStyle = document.createElement('style');
    printStyle.id = printStyleId;
    printStyle.textContent = `@page { size: A4; margin: ${printMargin}; }`;
    document.head.appendChild(printStyle);

    const restoreTitle = () => {
      document.title = seoTitle;
      printStyle.remove();
    };
    document.title = buildPdfFileName(settings, generatedResume, generatedCoverLetter, currentVersion);
    window.addEventListener('afterprint', restoreTitle, { once: true });
    window.print();
  };

  const handleEnterApp = useCallback((name: string) => {
    void name;
    setStorageString(STORAGE_KEYS.VISITED, '1');
    setShowLanding(false);
    // If name is still empty, show the welcome modal
    if (!settings.userName.trim()) {
      setShowWelcomeModal(true);
    }
  }, [settings.userName, setShowLanding]);

  const handleWelcomeSave = useCallback((name: string) => {
    const cleanName = cleanAIText(name).trim();
    if (!cleanName) return;
    setSettings(prev => sanitizeSettings({ ...prev, userName: cleanName }));
    setShowWelcomeModal(false);
  }, [setSettings]);

  const handleClearData = useCallback(() => { setShowClearConfirm(true); }, [setShowClearConfirm]);

  const confirmClearData = useCallback(() => {
    setResumeInput(''); setJobDescription(''); setGeneratedResume(null);
    setGeneratedCoverLetter(null); setAtsKeywords([]); setCurrentVersion(null);
    setEditLogs([]); setError(''); setActiveTab('input');
    setShowChanges(false); setShowProofMap(false);
    setShowEditHistory(false); setShowQuickEdit(false); setActiveCanvasEditBlock(null); setIsResumeCollapsed(false);
    setIsSinglePageMode(false);
    removeStorageItem(STORAGE_KEYS.RESUME_DATA);
    removeStorageItem(STORAGE_KEYS.JOB_DESCRIPTION);
    setShowClearConfirm(false);
  }, [
    setResumeInput, setJobDescription, setGeneratedResume, setGeneratedCoverLetter,
    setAtsKeywords, setCurrentVersion, setEditLogs, setError, setActiveTab,
    setShowChanges, setShowProofMap, setShowEditHistory, setShowQuickEdit,
    setActiveCanvasEditBlock,
    setIsResumeCollapsed, setShowClearConfirm,
  ]);

  const handleDeleteSavedDocuments = useCallback(() => {
    setShowDeleteDocsConfirm(true);
  }, []);

  const confirmDeleteSavedDocuments = useCallback(() => {
    const clearedSnapshot = buildPersistedAppState({
      resumeInput,
      jobDescription,
      generatedResume: null,
      generatedCoverLetter: null,
      atsKeywords: [],
      atsEnabled,
      settings,
      activeTab: 'input',
      versions: [],
      currentVersionId: null,
      isResumeCollapsed,
      resumeFormat,
      editLogs: [],
    });
    const clearedBackup: Partial<PersistedAppState> = {
      schemaVersion: clearedSnapshot.schemaVersion,
      savedAt: clearedSnapshot.savedAt,
      resumeInput: clearedSnapshot.resumeInput,
      jobDescription: clearedSnapshot.jobDescription,
      generatedResume: null,
      generatedCoverLetter: null,
      atsKeywords: [],
      atsEnabled: clearedSnapshot.atsEnabled,
      settings: clearedSnapshot.settings,
      activeTab: 'input',
      currentVersionId: null,
      isResumeCollapsed: clearedSnapshot.isResumeCollapsed,
      resumeFormat: clearedSnapshot.resumeFormat,
    };

    setVersions([]);
    setCurrentVersion(null);
    setGeneratedResume(null);
    setGeneratedCoverLetter(null);
    setAtsKeywords([]);
    setEditLogs([]);
    setError('');
    setActiveTab('input');
    setShowChanges(false);
    setShowProofMap(false);
    setShowEditHistory(false);
    setShowQuickEdit(false);
    setActiveCanvasEditBlock(null);
    setIsSinglePageMode(false);
    removeStorageItem(STORAGE_KEYS.VERSIONS);
    removeStorageItem(STORAGE_KEYS.EDIT_LOGS);
    setStorageItemDetailed(STORAGE_KEYS.APP_STATE, clearedSnapshot);
    setStorageItemDetailed(STORAGE_KEYS.APP_STATE_BACKUP, clearedBackup);
    setShowDeleteDocsConfirm(false);
  }, [
    setVersions, setCurrentVersion, setGeneratedResume, setGeneratedCoverLetter,
    setAtsKeywords, setEditLogs, setError, setActiveTab, setShowChanges,
    setShowProofMap, setShowEditHistory, setShowQuickEdit,
    setActiveCanvasEditBlock,
    resumeInput, jobDescription, atsEnabled, settings, isResumeCollapsed,
    resumeFormat,
  ]);

  const handleExportData = () => {
    const exportData = buildPersistedAppState({
      resumeInput, jobDescription, generatedResume, generatedCoverLetter, atsKeywords, atsEnabled,
      settings, activeTab, versions, currentVersionId: currentVersion?.id ?? null,
      isResumeCollapsed, resumeFormat, editLogs,
    });
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', 'jobfit_backup.json');
    document.body.appendChild(a); a.click(); a.remove();
  };

  const handleImportData = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          const importedState = normalizePersistedState(parsed);
          if (!importedState) throw new Error('Invalid backup');
          const restoredSession = restorePersistedSession(importedState);
          applyRestoredSession(restoredSession);
          setShowChanges(false); setShowEditHistory(false); setSaveHealthStatus('saved');
          alert('Data imported successfully!');
        } catch { alert('Error parsing backup file.'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleQuickEditSave = (updatedData: ResumeData, description: string) => {
    if (!generatedResume || currentVersion?.type === 'cover-letter') return;
    applyManualResumeEdit(updatedData, description);
    setShowQuickEdit(false);
  };

  const syncCurrentResumeVersion = (nextResume: ResumeData) => {
    if (!currentVersion || currentVersion.type === 'cover-letter') return;
    setCurrentVersion(prev => (
      prev && prev.id === currentVersion.id ? { ...prev, data: nextResume } : prev
    ));
    setVersions(prev => prev.map(version => (
      version.id === currentVersion.id ? { ...version, data: nextResume } : version
    )));
  };

  const applyManualResumeEdit = (updatedData: ResumeData, description: string) => {
    if (!generatedResume || currentVersion?.type === 'cover-letter') return;
    const cleanedData = cleanResumeData(updatedData);
    const nextState = resolveAppliedEditState({
      generatedResume, editLogs, nextData: cleanedData, description,
    });
    const nextResume = cleanResumeData(nextState.generatedResume ?? cleanedData);
    setEditLogs(nextState.editLogs);
    setGeneratedResume(nextResume);
    syncCurrentResumeVersion(nextResume);
  };

  const handleCanvasEditSave = (block: ResumeEditBlock, updatedData: ResumeData, description: string) => {
    void block;
    applyManualResumeEdit(updatedData, description);
    setActiveCanvasEditBlock(null);
  };

  const handleRevertEdit = (log: ResumeEditLog) => {
    const revertedState = resolveRevertedEditState({ generatedResume, editLogs, revertId: log.id });
    const revertedResume = revertedState.generatedResume ? cleanResumeData(revertedState.generatedResume) : null;
    setGeneratedResume(revertedResume);
    if (revertedResume) syncCurrentResumeVersion(revertedResume);
    setEditLogs(revertedState.editLogs);
  };

  const resumeCanvasEditing: ResumeCanvasEditingProps = {
    activeBlock: activeCanvasEditBlock,
    onStartEdit: setActiveCanvasEditBlock,
    onCancelEdit: () => setActiveCanvasEditBlock(null),
    onSaveBlock: handleCanvasEditSave,
  };

  useKeyboardShortcuts({
    onGenerate: handleGenerateResume,
    onTailor: handleGenerateTailoredResume,
    onSettings: () => setShowSettings(true),
    onHistory: () => setShowHome(true),
    onPrint: handleDownloadPDF,
    isLoading,
    hasResume: !!resumeInput.trim(),
    hasJobDescription: !!jobDescription.trim(),
  });

  const isCoverLetterView = currentVersion?.type === 'cover-letter' || (!generatedResume && !!generatedCoverLetter);
  const previewDocument = isCoverLetterView ? generatedCoverLetter : generatedResume;
  const providerIcon = `/${settings.provider === 'google' ? 'gemini' : settings.provider}.svg`;

  return (
    <>
      {showLanding && (
        <LandingPage
          key={settings.userName || 'new-user'}
          onEnter={handleEnterApp}
        />
      )}
      <div className="app" style={showLanding ? { display: 'none' } : {}}>
        <div className="app-shell">

        {/* ── Sidebar ── */}
        <header className="app-header no-print">
          <div className="header-left">
            <div className="logo">
              <span className="logo-icon" aria-hidden="true">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                  <path d="M12 3 21 12 12 21 3 12 12 3Z" stroke="currentColor" strokeWidth="1.8" />
                  <path d="M12 8 16 12 12 16 8 12 12 8Z" fill="currentColor" />
                </svg>
              </span>
              <span className="logo-text">
                JOBFIT{' '}
                <a
                  className="logo-byline"
                  href="https://www.linkedin.com/in/tanmay-kalbande/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  by Tanmay
                </a>
              </span>
            </div>
          </div>

          <div className="header-right">
            <div className="sidebar-primary-actions">
              <button className="icon-btn nav-action nav-action-primary" onClick={() => { setShowSettings(false); handleClearData(); }} title="Start New Resume">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 5v14" /><path d="M5 12h14" />
                </svg>
                <span>New Resume</span>
              </button>
              <button className="icon-btn nav-action" onClick={() => { setShowSettings(false); setShowHome(true); }} title="Saved Documents">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
                <span>Saved Docs</span>
              </button>
            </div>

            <div className="sidebar-data-section" ref={sidebarDataRef}>
              <div className={`card collapsible-card sidebar-card ${isResumeCollapsed ? 'collapsed' : ''}`}>
                <div className="card-header" onClick={() => setIsResumeCollapsed(!isResumeCollapsed)} style={{ cursor: 'pointer' }}>
                  <div className="header-title">
                    <span className={`collapse-icon ${isResumeCollapsed ? 'collapsed' : ''}`}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="6,9 12,15 18,9" />
                      </svg>
                    </span>
                    <h3>Base Resume</h3>
                    {resumeInput && isResumeCollapsed && (
                      <span className={`data-preview save-health-text save-health-${displayedSaveHealthStatus}`} title={saveHealthCopy.detail}>
                        <span>{saveHealthCopy.compactLabel}</span>
                      </span>
                    )}
                  </div>
                  {resumeInput && !isResumeCollapsed && (
                    <button className="text-btn" onClick={e => { e.stopPropagation(); handleClearData(); }}>Clear</button>
                  )}
                </div>
                {!isResumeCollapsed && (
                  <>
                    <textarea
                      value={resumeInput}
                      onChange={e => setResumeInput(e.target.value)}
                      placeholder="Paste all your resume details here...&#10;&#10;Include: contact info, work experience, skills, education, projects, certifications, etc."
                    />
                    <div className="card-footer">
                      <span className={`saved-indicator save-health-text save-health-${displayedSaveHealthStatus}`} title={saveHealthCopy.detail}>
                        {saveHealthCopy.compactLabel}
                      </span>
                    </div>
                  </>
                )}
              </div>

              {versions.length > 0 && (
                <div className="sidebar-doc-history" aria-label="Generated documents">
                  <div className="sdh-header">
                    <span>Generated Docs</span>
                    <button
                      type="button"
                      onClick={() => { setShowSettings(false); setShowHome(true); }}
                    >
                      View All
                    </button>
                  </div>
                  <div className="sdh-list">
                    {versions.map(version => {
                      const typeInfo = getVersionTypeInfo(version);
                      const isActive = currentVersion?.id === version.id;
                      return (
                        <button
                          key={version.id}
                          type="button"
                          className={`sdh-row ${isActive ? 'active' : ''}`}
                          onClick={() => handleQuickNavToVersion(version)}
                          title={`Open: ${version.name}`}
                        >
                          <span className="sdh-marker" style={{ color: typeInfo.color, borderColor: `${typeInfo.color}66` }}>
                            {typeInfo.marker}
                          </span>
                          <span className="sdh-copy">
                            <span className="sdh-title">{version.name}</span>
                            <span className="sdh-meta">
                              <span>{typeInfo.label}</span>
                              {version.jobTitle && <span>{version.jobTitle}</span>}
                              <span>{formatVersionAge(version.timestamp)}</span>
                            </span>
                          </span>
                          {version.alignmentScore !== undefined && version.alignmentScore > 0 && (
                            <span
                              className="sdh-score-pill"
                              style={{ color: getScoreColor(version.alignmentScore), borderColor: `${getScoreColor(version.alignmentScore)}55` }}
                              title={`Job alignment score: ${version.alignmentScore}%`}
                            >
                              {version.alignmentScore}%
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ── Sidebar footer with quick provider switcher ── */}
            <div className="sidebar-footer" ref={qpsRef} style={{ position: 'relative' }}>
              {showQuickProvider && (
                <QuickProviderSwitcher
                  settings={settings}
                  onChangeProvider={handleQuickProviderChange}
                  onChangeModel={handleQuickModelChange}
                  onOpenSettings={() => { setShowQuickProvider(false); setShowHome(false); setShowSettings(true); }}
                  onClose={() => setShowQuickProvider(false)}
                />
              )}

              {/* Provider badge — now opens quick switcher */}
              <button
                className={`provider-badge sidebar-provider ${showQuickProvider ? 'active' : ''}`}
                onClick={() => setShowQuickProvider(v => !v)}
                title="Switch AI provider / model"
              >
                <img src={providerIcon} alt={settings.provider} className="badge-icon" />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getProviderLabel()}
                </span>
                {/* current model pill */}
                <span style={{
                  fontSize: '0.52rem', fontFamily: 'var(--font-mono)', color: 'var(--c-dim)',
                  background: 'var(--c-surface)', border: '1px solid var(--c-border)',
                  borderRadius: '4px', padding: '1px 5px', flexShrink: 0, maxWidth: '80px',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {(PROVIDER_MODELS_MAP[settings.provider].find(m => m.value === (settings[PROVIDER_MODEL_KEY[settings.provider]] as string))?.label ?? '').replace(/\s*(Flash|Free|Instruct|Preview|Lite|Turbo|Versatile)/gi, m => m.trim()[0].toUpperCase()) || getModelUsed()?.split('/').pop()?.slice(0, 12)}
                </span>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ flexShrink: 0, opacity: 0.5 }}>
                  <polyline points={showQuickProvider ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} />
                </svg>
              </button>

              {/* Settings icon button */}
              <button
                className={`icon-btn nav-action sidebar-settings ${showSettings ? 'active' : ''}`}
                onClick={() => { setShowQuickProvider(false); setShowHome(false); setShowSettings(true); }}
                aria-label="Settings"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
                <span>Settings</span>
              </button>
            </div>
          </div>
        </header>

        {/* Mobile tabs */}
        <div className={`tab-nav no-print ${showSettings ? 'is-hidden' : ''}`}>
          <button className={`tab-btn ${activeTab === 'input' ? 'active' : ''}`} onClick={() => setActiveTab('input')}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Input
          </button>
          <button className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`} onClick={() => setActiveTab('preview')} disabled={!previewDocument}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14,2 14,8 20,8" />
            </svg>
            Preview
          </button>
        </div>

        <main className={`main-content ${showSettings || showHome ? 'settings-mode' : ''}`}>
          {showSettings ? (
            <div className="panel settings-panel active">
              <SettingsModal
                settings={settings}
                onSave={handleSaveSettings}
                onClose={() => setShowSettings(false)}
                onExportData={handleExportData}
                onImportData={handleImportData}
                onDeleteSavedDocuments={handleDeleteSavedDocuments}
                savedDocumentCount={versions.length}
                mode="screen"
              />
            </div>
          ) : showHome ? (
            <div className="panel home-panel active">
              <HomeModal
                versions={versions}
                onClose={() => setShowHome(false)}
                onSelectVersion={handleSelectVersion}
                onDeleteVersion={handleDeleteVersion}
                currentVersionId={currentVersion?.id ?? null}
                mode="screen"
              />
            </div>
          ) : (
            <>
              {/* Input Panel */}
              <div className={`panel input-panel no-print ${activeTab === 'input' ? 'active' : ''}`}>
                <div className="panel-inner">
                  <div className="card">
                    <div className="card-header">
                      <h3>Job Description</h3>
                      <span className="badge">Optional</span>
                    </div>
                    <textarea
                      value={jobDescription}
                      onChange={e => setJobDescription(e.target.value)}
                      placeholder="Paste the job description here to tailor your resume..."
                      rows={6}
                    />
                    <label className="toggle-label">
                      <input type="checkbox" checked={atsEnabled} onChange={e => setAtsEnabled(e.target.checked)} />
                      <span className="toggle-switch" />
                      <div className="toggle-text">
                        <span>ATS Optimization</span>
                        <span className="toggle-hint">Extract supported keywords for the change log</span>
                      </div>
                    </label>
                  </div>

                  {error && (
                    <div className="error-message">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                      </svg>
                      {error}
                    </div>
                  )}

                  <div className="action-buttons">
                    <button className="btn-primary" onClick={handleGenerateResume} disabled={isLoading}>
                      {isLoading && loadingMessage.toLowerCase().includes('resume data') ? (
                        <><span className="spinner-small" />Generating...</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10" /></svg>Generate Resume</>
                      )}
                    </button>
                    <button className="btn-outline" onClick={handleGenerateTailoredResume} disabled={isLoading || !jobDescription.trim()}>
                      {isLoading && loadingMessage.toLowerCase().includes('tailoring') ? (
                        <><span className="spinner-small" />Tailoring...</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" /></svg>Tailor for Job</>
                      )}
                    </button>
                    <button className="btn-outline" onClick={handleGenerateSinglePage} disabled={isLoading}>
                      {isLoading && loadingMessage.toLowerCase().includes('condensing') ? (
                        <><span className="spinner-small" />Condensing...</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18" /><path d="M9 21V9" /></svg>Single Page</>
                      )}
                    </button>
                    <button className="btn-outline btn-cover-letter" onClick={handleGenerateCoverLetter} disabled={isLoading}>
                      {isLoading && loadingMessage.toLowerCase().includes('cover letter') ? (
                        <><span className="spinner-small" />Building Letter...</>
                      ) : (
                        <><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="16" y2="17" /></svg>Cover Letter</>
                      )}
                    </button>
                  </div>

                  {isLoading && (
                    <div className="loading-card">
                      <div className="loading-animation">
                        <div className="loading-dot" /><div className="loading-dot" /><div className="loading-dot" />
                      </div>
                      <span>{loadingMessage}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview Panel */}
              <div className={`panel preview-panel ${activeTab === 'preview' ? 'active' : ''} ${!previewDocument && !isLoading ? 'preview-panel-empty' : ''}`}>
                {previewDocument ? (
                  <>
                    <div className="preview-toolbar no-print">
                      <div className="toolbar-row">
                        <div className="toolbar-left">
                          <h3>{currentVersion?.name || 'Resume Preview'}</h3>
                          {currentVersion && (currentVersion.changes?.length || currentVersion.atsKeywords?.length) && (
                            <button className={`changes-btn ${showChanges ? 'active' : ''}`} onClick={() => { setShowChanges(!showChanges); if (showProofMap) setShowProofMap(false); }}>
                              <span className="changes-icon">✦</span>{currentVersion.changes?.length || 0} changes
                            </button>
                          )}
                          {currentVersion?.proofMap?.length ? (
                            <button className={`changes-btn changes-btn-proof ${showProofMap ? 'active' : ''}`} onClick={() => { setShowProofMap(!showProofMap); if (showChanges) setShowChanges(false); }}>
                              <span className="changes-icon">◎</span>Proof Map
                            </button>
                          ) : null}
                          {currentVersion?.alignmentScore !== undefined && currentVersion.alignmentScore > 0 && (
                            <div
                              className="toolbar-score-pill"
                              style={{
                                color: getScoreColor(currentVersion.alignmentScore),
                                borderColor: `${getScoreColor(currentVersion.alignmentScore)}55`,
                                background: `${getScoreColor(currentVersion.alignmentScore)}12`,
                              }}
                              title={`Job alignment score: ${currentVersion.alignmentScore}%`}
                            >
                              <span className="toolbar-score-icon">◈</span>
                              <span className="toolbar-score-value">{currentVersion.alignmentScore}%</span>
                              <span className="toolbar-score-label">match</span>
                            </div>
                          )}
                        </div>
                        <div className="toolbar-right">
                          <div className="format-toggle">
                            <button className={`format-btn ${resumeFormat === 'classic' ? 'active' : ''}`} onClick={() => setResumeFormat('classic')}>Classic</button>
                            <button className={`format-btn ${resumeFormat === 'modern' ? 'active' : ''}`} onClick={() => setResumeFormat('modern')}>Modern</button>
                            <button className={`format-btn ${resumeFormat === 'executive' ? 'active' : ''}`} onClick={() => setResumeFormat('executive')}>Executive</button>
                          </div>
                        </div>
                      </div>

                      <div className="toolbar-actions">
                        {!isCoverLetterView && (
                          <>
                            <button className="toolbar-action-btn" onClick={() => setShowQuickEdit(true)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                              Edit
                            </button>
                            <button className={`toolbar-action-btn ${showEditHistory ? 'active' : ''}`} onClick={() => setShowEditHistory(!showEditHistory)}>
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                              </svg>
                              History{editLogs.length > 0 && <span className="toolbar-badge">{editLogs.length}</span>}
                            </button>
                          </>
                        )}
                        <button className="btn-download" onClick={handleDownloadPDF}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                            <polyline points="7,10 12,15 17,10" /><line x1="12" y1="15" x2="12" y2="3" />
                          </svg>
                          PDF
                        </button>
                      </div>
                    </div>

                    {showEditHistory && !isCoverLetterView && (
                      <EditHistoryPanel editLogs={editLogs} onRevert={handleRevertEdit} onClose={() => setShowEditHistory(false)} />
                    )}
                    {showChanges && currentVersion && (currentVersion.changes?.length || currentVersion.atsKeywords?.length) && (
                      <ChangesView version={currentVersion} onClose={() => setShowChanges(false)} />
                    )}

                    <div className="preview-body">
                      {showProofMap && currentVersion && currentVersion.proofMap?.length ? (
                        <ProofMapPanel version={currentVersion} onClose={() => setShowProofMap(false)} fullView />
                      ) : (
                        <>
                          <div id="resume-cv-content" className="resume-wrapper">
                            {currentVersion?.type === 'cover-letter' && generatedCoverLetter ? (
                              resumeFormat === 'executive' ? <CoverLetterTemplateExecutive data={generatedCoverLetter} />
                              : resumeFormat === 'modern' ? <CoverLetterTemplateModern data={generatedCoverLetter} />
                              : <CoverLetterTemplate data={generatedCoverLetter} />
                            ) : isSinglePageMode && generatedResume ? (
                              <ResumeTemplateCompact data={generatedResume} style={resumeFormat} editing={resumeCanvasEditing} />
                            ) : resumeFormat === 'executive' ? <ResumeTemplateExecutive data={generatedResume!} editing={resumeCanvasEditing} />
                              : resumeFormat === 'modern' ? <ResumeTemplateModern data={generatedResume!} editing={resumeCanvasEditing} />
                              : <ResumeTemplate data={generatedResume!} editing={resumeCanvasEditing} />
                            }
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : isLoading ? (
                  <>
                    <div className="preview-toolbar no-print">
                      <div className="toolbar-left">
                        <h3>Building Your Document...</h3>
                        <span className="loading-status">{loadingMessage || 'Analyzing your data...'}</span>
                      </div>
                    </div>
                    <div className="resume-wrapper"><SkeletonResume /></div>
                  </>
                ) : (
                  <div className="empty-preview no-print">
                    <div className="empty-icon">
                      <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14,2 14,8 20,8" /><line x1="8" y1="13" x2="16" y2="13" /><line x1="8" y1="17" x2="12" y2="17" />
                      </svg>
                    </div>
                    <h3>Ready to Build</h3>
                    <p>Paste your resume on the left and generate a polished, job-ready document in seconds.</p>
                    <div className="empty-shortcuts">
                      <span className="empty-shortcut"><kbd>Ctrl</kbd><kbd>G</kbd> Generate</span>
                      <span className="empty-shortcut"><kbd>Ctrl</kbd><kbd>T</kbd> Tailor</span>
                      <span className="empty-shortcut"><kbd>Ctrl</kbd><kbd>P</kbd> Print</span>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </main>
        </div>

        <footer className="app-footer no-print">
          <p>
            Built by{' '}
            <a
              href="https://www.linkedin.com/in/tanmay-kalbande/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Tanmay
            </a>
          </p>
        </footer>

        {showQuickEdit && generatedResume && (
          <QuickEditModal data={generatedResume} onSave={handleQuickEditSave} onClose={() => setShowQuickEdit(false)} />
        )}
        {showClearConfirm && (
          <ConfirmModal
            title="Start New Resume"
            message="Clear the current draft and preview? Your saved version history will stay available."
            confirmText="Start New" cancelText="Cancel"
            onConfirm={confirmClearData} onCancel={() => setShowClearConfirm(false)}
            isDestructive={true}
          />
        )}
        {showDeleteDocsConfirm && (
          <ConfirmModal
            title="Delete Saved Documents"
            message="Delete all generated documents and history? Your profile, API keys, base resume, and current job description will stay saved."
            confirmText="Delete Docs" cancelText="Cancel"
            onConfirm={confirmDeleteSavedDocuments} onCancel={() => setShowDeleteDocsConfirm(false)}
            isDestructive={true}
          />
        )}
        {showWelcomeModal && (
          <WelcomeModal onSave={handleWelcomeSave} />
        )}
      </div>
    </>
  );
}

export default function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <AppProviders>
        <AppContent />
      </AppProviders>
    </ErrorBoundary>
  );
}
