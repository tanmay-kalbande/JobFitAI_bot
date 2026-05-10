import { useState } from 'react';
import type { FormEvent } from 'react';
import './WelcomeModal.css';

interface WelcomeModalProps {
    onSave: (name: string) => void;
}

export function WelcomeModal({ onSave }: WelcomeModalProps) {
    const [name, setName] = useState('');

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const cleanName = name.trim();
        if (cleanName) {
            onSave(cleanName);
        }
    };

    return (
        <div className="modal-overlay welcome-modal-overlay">
            <div className="modal-content sm-modal welcome-modal" onClick={e => e.stopPropagation()}>
                <div className="sm-header">
                    <div className="sm-header-text">
                        <h2 className="sm-title">Welcome to JobFit AI</h2>
                        <p className="sm-subtitle">Let's get started with your name</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="sm-form">
                    <div className="sm-scroll" style={{ paddingBottom: '1.5rem' }}>
                        <div className="sm-section sm-section-profile" style={{ border: 'none', marginTop: '0.5rem' }}>
                            <div className="sm-field-row">
                                <label className="sm-label">Your Full Name</label>
                                <input
                                    type="text"
                                    className="sm-input"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="e.g. John Doe"
                                    autoComplete="name"
                                    autoFocus
                                    required
                                />
                                <p className="sm-hint" style={{ marginTop: '0.6rem', fontSize: '0.7rem', color: 'var(--c-muted)' }}>
                                    This will be used to automatically format your resume and PDF filenames.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="sm-actions" style={{ borderTop: '1px solid var(--c-border)', paddingTop: '1.25rem' }}>
                        <button type="submit" className="sm-btn-save" style={{ width: '100%' }} disabled={!name.trim()}>
                            Continue to App
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
