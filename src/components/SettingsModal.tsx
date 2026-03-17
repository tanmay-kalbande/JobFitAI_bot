import { useState } from 'react';
import type { AISettings, AIProvider } from '../types';
import { GOOGLE_MODELS, CEREBRAS_MODELS, MISTRAL_MODELS, GROQ_MODELS } from '../types';
import { CustomDropdown } from './CustomDropdown';

interface SettingsModalProps {
    settings: AISettings;
    onSave: (settings: AISettings) => void;
    onClose: () => void;
    onExportData?: () => void;
    onImportData?: () => void;
}

const PROVIDERS: { id: AIProvider; label: string; icon: string }[] = [
    { id: 'google',   label: 'Google',   icon: '/gemini.svg'   },
    { id: 'cerebras', label: 'Cerebras', icon: '/cerebras.svg' },
    { id: 'mistral',  label: 'Mistral',  icon: '/mistral.svg'  },
    { id: 'groq',     label: 'Groq',     icon: '/groq.svg'     },
];

const PROVIDER_CONFIG: Record<AIProvider, {
    keyField: keyof AISettings;
    modelField: keyof AISettings;
    models: { value: string; label: string }[];
    placeholder: string;
    hint: string;
}> = {
    google:   { keyField: 'googleApiKey',   modelField: 'googleModel',   models: GOOGLE_MODELS,   placeholder: 'Google AI Studio API key',  hint: 'Get from: ai.google.dev' },
    cerebras: { keyField: 'cerebrasApiKey', modelField: 'cerebrasModel', models: CEREBRAS_MODELS, placeholder: 'Cerebras API key',          hint: 'Get from: cloud.cerebras.ai' },
    mistral:  { keyField: 'mistralApiKey',  modelField: 'mistralModel',  models: MISTRAL_MODELS,  placeholder: 'Mistral API key',           hint: 'Get from: console.mistral.ai' },
    groq:     { keyField: 'groqApiKey',     modelField: 'groqModel',     models: GROQ_MODELS,     placeholder: 'Groq API key',              hint: 'Get from: console.groq.com' },
};

export function SettingsModal({ settings, onSave, onClose, onExportData, onImportData }: SettingsModalProps) {
    const [local, setLocal] = useState<AISettings>({ ...settings });
    const [activeTab, setActiveTab] = useState<AIProvider>(settings.provider);
    const [showKey, setShowKey] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(local);
        onClose();
    };

    const cfg = PROVIDER_CONFIG[activeTab];
    const currentKey = String(local[cfg.keyField] ?? '');
    const currentModel = String(local[cfg.modelField] ?? '');

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content settings-modal" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-header">
                    <div>
                        <h2>Settings</h2>
                        <p className="settings-subtitle">AI provider · models · preferences</p>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    {/* Scrollable body */}
                    <div className="settings-scroll">

                        {/* User name */}
                        <div className="settings-section">
                            <div className="settings-section-label">Profile</div>
                            <div className="sm-field">
                                <label className="sm-label">Your Name</label>
                                <input
                                    type="text"
                                    className="sm-input"
                                    value={local.userName}
                                    onChange={e => setLocal({ ...local, userName: e.target.value })}
                                    placeholder="Full name (used in PDF filenames)"
                                />
                            </div>
                        </div>

                        {/* Provider */}
                        <div className="settings-section">
                            <div className="settings-section-label">AI Provider</div>

                            {/* Tab strip */}
                            <div className="sm-provider-tabs">
                                {PROVIDERS.map(p => (
                                    <button
                                        key={p.id}
                                        type="button"
                                        className={`sm-provider-tab ${activeTab === p.id ? 'active' : ''}`}
                                        onClick={() => {
                                            setActiveTab(p.id);
                                            setLocal(prev => ({ ...prev, provider: p.id }));
                                            setShowKey(false);
                                        }}
                                    >
                                        <img src={p.icon} alt={p.label} className="sm-tab-icon" />
                                        <span>{p.label}</span>
                                        {local.provider === p.id && (
                                            <span className="sm-active-dot" />
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* API Key */}
                            <div className="sm-field" style={{ marginTop: '1rem' }}>
                                <label className="sm-label">API Key</label>
                                <div className="sm-input-row">
                                    <input
                                        type={showKey ? 'text' : 'password'}
                                        className="sm-input sm-input-key"
                                        value={currentKey}
                                        onChange={e => setLocal({ ...local, [cfg.keyField]: e.target.value })}
                                        placeholder={cfg.placeholder}
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        className="sm-eye-btn"
                                        onClick={() => setShowKey(v => !v)}
                                        title={showKey ? 'Hide key' : 'Show key'}
                                    >
                                        {showKey ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                                                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                                                <line x1="1" y1="1" x2="23" y2="23" />
                                            </svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                                <circle cx="12" cy="12" r="3" />
                                            </svg>
                                        )}
                                    </button>
                                </div>
                                <span className="sm-hint">
                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                        <polyline points="15 3 21 3 21 9" />
                                        <line x1="10" y1="14" x2="21" y2="3" />
                                    </svg>
                                    {cfg.hint}
                                </span>
                            </div>

                            {/* Model */}
                            <div className="sm-field">
                                <label className="sm-label">Model</label>
                                <CustomDropdown
                                    value={currentModel}
                                    options={cfg.models}
                                    onChange={val => setLocal({ ...local, [cfg.modelField]: val })}
                                    placeholder="Select model"
                                />
                            </div>
                        </div>

                        {/* Data Management */}
                        <div className="settings-section">
                            <div className="settings-section-label">Data</div>
                            <div className="sm-data-row">
                                {onExportData && (
                                    <button type="button" className="sm-data-btn" onClick={onExportData}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="7 10 12 15 17 10" />
                                            <line x1="12" y1="15" x2="12" y2="3" />
                                        </svg>
                                        Export backup
                                    </button>
                                )}
                                {onImportData && (
                                    <button type="button" className="sm-data-btn" onClick={onImportData}>
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                            <polyline points="17 8 12 3 7 8" />
                                            <line x1="12" y1="3" x2="12" y2="15" />
                                        </svg>
                                        Import backup
                                    </button>
                                )}
                            </div>
                            <p className="sm-data-hint">
                                Exports your base resume data and API keys to a JSON file.
                            </p>
                        </div>
                    </div>

                    {/* Footer actions */}
                    <div className="modal-actions settings-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
