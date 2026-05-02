import { useState } from 'react';
import type { FormEvent } from 'react';
import type { AISettings, AIProvider } from '../types';
import {
    GOOGLE_MODELS,
    CEREBRAS_MODELS,
    MISTRAL_MODELS,
    GROQ_MODELS,
    SAMBANOVA_MODELS,
    ZAI_MODELS,
    OPENROUTER_MODELS,
} from '../types';
import { CustomDropdown } from './CustomDropdown';

interface SettingsModalProps {
    settings: AISettings;
    onSave: (settings: AISettings) => void;
    onClose: () => void;
    onExportData?: () => void;
    onImportData?: () => void;
    mode?: 'modal' | 'screen';
}



const PROVIDERS: { id: AIProvider; label: string; icon: string }[] = [
    { id: 'google', label: 'Google', icon: '/gemini.svg' },
    { id: 'cerebras', label: 'Cerebras', icon: '/cerebras.svg' },
    { id: 'mistral', label: 'Mistral', icon: '/mistral.svg' },
    { id: 'groq', label: 'Groq', icon: '/groq.svg' },
    { id: 'sambanova', label: 'SambaNova', icon: '/sambanova.svg' },
    { id: 'zai', label: 'Z.AI', icon: '/zai.svg' },
    { id: 'openrouter', label: 'OpenRouter', icon: '/openrouter.svg' },
];

const PROVIDER_COLORS: Record<AIProvider, string> = {
    google: '#4285F4',
    cerebras: '#FFFFFF',
    mistral: '#F47F20',
    groq: '#F55036',
    sambanova: '#EA4335',
    zai: '#9B51E0',
    openrouter: '#00CF7F',
};

const PROVIDER_CONFIG: Record<AIProvider, {
    keyField: keyof AISettings;
    modelField: keyof AISettings;
    models: { value: string; label: string }[];
    placeholder: string;
    hint: string;
}> = {
    google: { keyField: 'googleApiKey', modelField: 'googleModel', models: GOOGLE_MODELS, placeholder: 'Google AI Studio API key', hint: 'ai.google.dev' },
    cerebras: { keyField: 'cerebrasApiKey', modelField: 'cerebrasModel', models: CEREBRAS_MODELS, placeholder: 'Cerebras API key', hint: 'cloud.cerebras.ai' },
    mistral: { keyField: 'mistralApiKey', modelField: 'mistralModel', models: MISTRAL_MODELS, placeholder: 'Mistral API key', hint: 'console.mistral.ai' },
    groq: { keyField: 'groqApiKey', modelField: 'groqModel', models: GROQ_MODELS, placeholder: 'Groq API key', hint: 'console.groq.com' },
    sambanova: { keyField: 'sambanovaApiKey', modelField: 'sambanovaModel', models: SAMBANOVA_MODELS, placeholder: 'SambaNova API key', hint: 'cloud.sambanova.ai' },
    zai: { keyField: 'zaiApiKey', modelField: 'zaiModel', models: ZAI_MODELS, placeholder: 'Z.AI API key', hint: 'z.ai' },
    openrouter: { keyField: 'openrouterApiKey', modelField: 'openrouterModel', models: OPENROUTER_MODELS, placeholder: 'OpenRouter API key', hint: 'openrouter.ai' },
};

export function SettingsModal({
    settings,
    onSave,
    onClose,
    onExportData,
    onImportData,
    mode = 'modal',
}: SettingsModalProps) {
    const [local, setLocal] = useState<AISettings>({ ...settings });
    const [activeTab, setActiveTab] = useState<AIProvider>(settings.provider);
    const [showKey, setShowKey] = useState(false);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSave(local);
        onClose();
    };

    const cfg = PROVIDER_CONFIG[activeTab];
    const currentKey = String(local[cfg.keyField] ?? '');
    const currentModel = String(local[cfg.modelField] ?? '');

    const content = (
        <>
            <div className="sm-header">
                <div className="sm-header-text">
                    <h2 className="sm-title">Settings</h2>
                    <p className="sm-subtitle">Provider · Models · Profile</p>
                </div>
                <button className="sm-close-btn" onClick={onClose} aria-label="Close settings">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <form onSubmit={handleSubmit} className="sm-form">
                <div className="sm-scroll">

                    {/* Profile */}
                    <div className="sm-section">
                        <div className="sm-section-label">Profile</div>
                        <div className="sm-field-row">
                            <label className="sm-label">Your Name</label>
                            <input
                                type="text"
                                className="sm-input"
                                value={local.userName}
                                onChange={e => setLocal({ ...local, userName: e.target.value })}
                                placeholder="Used in PDF filenames"
                                autoComplete="name"
                            />
                        </div>
                    </div>

                    {/* Provider Tabs */}
                    <div className="sm-section">
                        <div className="sm-section-label">AI Provider</div>
                        <div className="sm-provider-grid">
                            {PROVIDERS.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    className={`sm-provider-chip ${activeTab === p.id ? 'active' : ''}`}
                                    onClick={() => {
                                        setActiveTab(p.id);
                                        setLocal(prev => ({ ...prev, provider: p.id }));
                                        setShowKey(false);
                                    }}
                                >
                                    <img 
                                        src={p.icon} 
                                        alt="" 
                                        className="sm-chip-icon" 
                                        style={{ 
                                            filter: 'brightness(0) invert(1)',
                                            boxShadow: `0 0 12px ${PROVIDER_COLORS[p.id]}88`,
                                            backgroundColor: 'rgba(255,255,255,0.05)',
                                            padding: '3px'
                                        }} 
                                    />
                                    <span className="sm-chip-label">{p.label}</span>
                                    {local.provider === p.id && <span className="sm-chip-dot" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Key */}
                    <div className="sm-section">
                        <div className="sm-section-label">API Key</div>
                        <div className="sm-field-row">
                            <div className="sm-key-row">
                                <input
                                    type={showKey ? 'text' : 'password'}
                                    className="sm-input sm-input-mono"
                                    value={currentKey}
                                    onChange={e => setLocal({ ...local, [cfg.keyField]: e.target.value })}
                                    placeholder={cfg.placeholder}
                                    autoComplete="off"
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    spellCheck={false}
                                />
                                <button
                                    type="button"
                                    className="sm-eye-btn"
                                    onClick={() => setShowKey(v => !v)}
                                    title={showKey ? 'Hide' : 'Show'}
                                >
                                    {showKey ? (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                                            <line x1="1" y1="1" x2="23" y2="23" />
                                        </svg>
                                    ) : (
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                            <circle cx="12" cy="12" r="3" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <div className="sm-hint">
                                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                                    <polyline points="15 3 21 3 21 9" />
                                    <line x1="10" y1="14" x2="21" y2="3" />
                                </svg>
                                Get key from: {cfg.hint}
                            </div>
                        </div>
                    </div>

                    {/* Model */}
                    <div className="sm-section">
                        <div className="sm-section-label">Model</div>
                        <div className="sm-field-row sm-field-row-dropdown">
                            <CustomDropdown
                                value={currentModel}
                                options={cfg.models}
                                onChange={val => setLocal({ ...local, [cfg.modelField]: val })}
                                placeholder="Select model"
                            />
                        </div>
                    </div>

                    {/* Data */}
                    <div className="sm-section sm-section-last">
                        <div className="sm-section-label">Data</div>
                        <div className="sm-data-btns">
                            {onExportData && (
                                <button type="button" className="sm-data-btn" onClick={onExportData}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="7 10 12 15 17 10" />
                                        <line x1="12" y1="15" x2="12" y2="3" />
                                    </svg>
                                    Export backup
                                </button>
                            )}
                            {onImportData && (
                                <button type="button" className="sm-data-btn" onClick={onImportData}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                                        <polyline points="17 8 12 3 7 8" />
                                        <line x1="12" y1="3" x2="12" y2="15" />
                                    </svg>
                                    Import backup
                                </button>
                            )}
                        </div>
                        <p className="sm-data-hint">Exports draft, history, preferences, and API keys.</p>
                    </div>
                </div>

                <div className="sm-actions">
                    <button type="button" className="sm-btn-cancel" onClick={onClose}>Cancel</button>
                    <button type="submit" className="sm-btn-save">Save Settings</button>
                </div>
            </form>
        </>
    );

    if (mode === 'screen') {
        return (
            <section className="settings-screen-wrap" aria-label="Settings">
                <div className="settings-screen-inner">
                    {content}
                </div>
            </section>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content sm-modal" onClick={e => e.stopPropagation()}>
                {content}
            </div>
        </div>
    );
}
