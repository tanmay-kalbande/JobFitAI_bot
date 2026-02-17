import { useState } from 'react';
import type { AISettings, AIProvider } from '../types';
import { GOOGLE_MODELS, CEREBRAS_MODELS, MISTRAL_MODELS } from '../types';
import { CustomDropdown } from './CustomDropdown';

interface SettingsModalProps {
    settings: AISettings;
    onSave: (settings: AISettings) => void;
    onClose: () => void;
}

export function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
    const [localSettings, setLocalSettings] = useState<AISettings>(settings);
    const [activeTab, setActiveTab] = useState<AIProvider>(settings.provider);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(localSettings);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>AI Settings</h2>
                        <p style={{ fontSize: '0.75rem', color: '#5a5f7a', marginTop: '0.25rem' }}>
                            Configure your preferred AI providers and models
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '0 1.25rem' }}>
                        {/* User Name (for PDF naming) */}
                        <div className="form-group user-name-group" style={{ marginTop: '1rem' }}>
                            <input
                                type="text"
                                value={localSettings.userName}
                                onChange={(e) =>
                                    setLocalSettings({ ...localSettings, userName: e.target.value })
                                }
                                placeholder="Enter your full name"
                                style={{ fontSize: '1rem', fontWeight: 600 }}
                            />
                            <span className="hint">Used for naming exported PDF files</span>
                        </div>

                        {/* Provider Tabs */}
                        <div className="provider-tabs">
                            <button
                                type="button"
                                className={`tab ${activeTab === 'google' ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab('google');
                                    setLocalSettings({ ...localSettings, provider: 'google' });
                                }}
                            >
                                <img src="/gemini.svg" alt="Google" className="tab-icon-img" />
                                Google
                            </button>
                            <button
                                type="button"
                                className={`tab ${activeTab === 'cerebras' ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab('cerebras');
                                    setLocalSettings({ ...localSettings, provider: 'cerebras' });
                                }}
                            >
                                <img src="/cerebras.svg" alt="Cerebras" className="tab-icon-img" />
                                Cerebras
                            </button>
                            <button
                                type="button"
                                className={`tab ${activeTab === 'mistral' ? 'active' : ''}`}
                                onClick={() => {
                                    setActiveTab('mistral');
                                    setLocalSettings({ ...localSettings, provider: 'mistral' });
                                }}
                            >
                                <img src="/mistral.svg" alt="Mistral" className="tab-icon-img" />
                                Mistral
                            </button>
                        </div>

                        {/* Google Settings */}
                        {activeTab === 'google' && (
                            <div className="provider-settings">
                                <div className="form-group">
                                    <label>API Key</label>
                                    <input
                                        type="password"
                                        value={localSettings.googleApiKey}
                                        onChange={(e) =>
                                            setLocalSettings({ ...localSettings, googleApiKey: e.target.value })
                                        }
                                        placeholder="Enter your Google AI Studio API key"
                                    />
                                    <span className="hint">Get from: ai.google.dev</span>
                                </div>

                                <div className="form-group">
                                    <label>Model</label>
                                    <CustomDropdown
                                        value={localSettings.googleModel}
                                        options={GOOGLE_MODELS}
                                        onChange={(val) => setLocalSettings({ ...localSettings, googleModel: val })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Cerebras Settings */}
                        {activeTab === 'cerebras' && (
                            <div className="provider-settings">
                                <div className="form-group">
                                    <label>API Key</label>
                                    <input
                                        type="password"
                                        value={localSettings.cerebrasApiKey}
                                        onChange={(e) =>
                                            setLocalSettings({ ...localSettings, cerebrasApiKey: e.target.value })
                                        }
                                        placeholder="Enter your Cerebras API key"
                                    />
                                    <span className="hint">Get from: cloud.cerebras.ai</span>
                                </div>

                                <div className="form-group">
                                    <label>Model</label>
                                    <CustomDropdown
                                        value={localSettings.cerebrasModel}
                                        options={CEREBRAS_MODELS}
                                        onChange={(val) => setLocalSettings({ ...localSettings, cerebrasModel: val })}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Mistral Settings */}
                        {activeTab === 'mistral' && (
                            <div className="provider-settings">
                                <div className="form-group">
                                    <label>API Key</label>
                                    <input
                                        type="password"
                                        value={localSettings.mistralApiKey}
                                        onChange={(e) =>
                                            setLocalSettings({ ...localSettings, mistralApiKey: e.target.value })
                                        }
                                        placeholder="Enter your Mistral API key"
                                    />
                                    <span className="hint">Get from: console.mistral.ai</span>
                                </div>

                                <div className="form-group">
                                    <label>Model</label>
                                    <CustomDropdown
                                        value={localSettings.mistralModel}
                                        options={MISTRAL_MODELS}
                                        onChange={(val) => setLocalSettings({ ...localSettings, mistralModel: val })}
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="modal-actions">
                        <button type="button" className="btn-secondary" onClick={onClose}>
                            Cancel
                        </button>
                        <button type="submit" className="btn-primary">
                            Save Settings
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
