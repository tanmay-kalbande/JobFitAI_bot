import { useState } from 'react';
import type { ResumeData } from '../types';

interface QuickEditModalProps {
    data: ResumeData;
    onSave: (updatedData: ResumeData, description: string) => void;
    onClose: () => void;
}

export function QuickEditModal({ data, onSave, onClose }: QuickEditModalProps) {
    const [editData, setEditData] = useState<ResumeData>({ ...data });
    const [editDescription, setEditDescription] = useState('');
    const [activeSection, setActiveSection] = useState<'summary' | 'title' | 'skills' | 'experience'>('summary');

    const handleSave = () => {
        const desc = editDescription.trim() || 'Manual edit';
        onSave(editData, desc);
    };

    const handleSkillChange = (key: string, value: string) => {
        setEditData({
            ...editData,
            skills: { ...editData.skills, [key]: value }
        });
    };

    const handleDutyChange = (expIdx: number, dutyIdx: number, value: string) => {
        const newExperiences = [...editData.experiences];
        const newDuties = [...newExperiences[expIdx].duties];
        newDuties[dutyIdx] = value;
        newExperiences[expIdx] = { ...newExperiences[expIdx], duties: newDuties };
        setEditData({ ...editData, experiences: newExperiences });
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content quick-edit-modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div>
                        <h2>Quick Edit</h2>
                        <p style={{ fontSize: '0.75rem', color: '#5a5f7a', marginTop: '0.25rem' }}>
                            Make small changes to your resume
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="quick-edit-body">
                    {/* Section Tabs */}
                    <div className="quick-edit-tabs">
                        <button
                            className={`qe-tab ${activeSection === 'title' ? 'active' : ''}`}
                            onClick={() => setActiveSection('title')}
                        >
                            Title
                        </button>
                        <button
                            className={`qe-tab ${activeSection === 'summary' ? 'active' : ''}`}
                            onClick={() => setActiveSection('summary')}
                        >
                            Summary
                        </button>
                        <button
                            className={`qe-tab ${activeSection === 'skills' ? 'active' : ''}`}
                            onClick={() => setActiveSection('skills')}
                        >
                            Skills
                        </button>
                        <button
                            className={`qe-tab ${activeSection === 'experience' ? 'active' : ''}`}
                            onClick={() => setActiveSection('experience')}
                        >
                            Experience
                        </button>
                    </div>

                    {/* Edit Area */}
                    <div className="quick-edit-content">
                        {activeSection === 'title' && (
                            <div className="qe-section">
                                <label>Job Title</label>
                                <input
                                    type="text"
                                    value={editData.title}
                                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                    className="qe-input"
                                />
                                <label style={{ marginTop: '0.75rem' }}>Full Name</label>
                                <input
                                    type="text"
                                    value={editData.fullName}
                                    onChange={(e) => setEditData({ ...editData, fullName: e.target.value })}
                                    className="qe-input"
                                />
                            </div>
                        )}

                        {activeSection === 'summary' && (
                            <div className="qe-section">
                                <label>Professional Summary</label>
                                <textarea
                                    value={editData.summary}
                                    onChange={(e) => setEditData({ ...editData, summary: e.target.value })}
                                    rows={6}
                                    className="qe-textarea"
                                />
                            </div>
                        )}

                        {activeSection === 'skills' && (
                            <div className="qe-section">
                                {Object.entries(editData.skills).map(([key, value]) => (
                                    <div key={key} className="qe-skill-row">
                                        <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                                        <input
                                            type="text"
                                            value={value}
                                            onChange={(e) => handleSkillChange(key, e.target.value)}
                                            className="qe-input"
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeSection === 'experience' && (
                            <div className="qe-section">
                                {editData.experiences.map((exp, expIdx) => (
                                    <div key={expIdx} className="qe-experience-block">
                                        <div className="qe-exp-header">
                                            <strong>{exp.jobTitle}</strong>
                                            <span className="qe-exp-company">{exp.company}</span>
                                        </div>
                                        {exp.duties.map((duty, dutyIdx) => (
                                            <div key={dutyIdx} className="qe-duty-row">
                                                <span className="qe-duty-bullet">•</span>
                                                <input
                                                    type="text"
                                                    value={duty}
                                                    onChange={(e) => handleDutyChange(expIdx, dutyIdx, e.target.value)}
                                                    className="qe-input qe-duty-input"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Change Description */}
                    <div className="qe-description">
                        <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Describe your change (e.g., 'Updated summary for data role')"
                            className="qe-input qe-desc-input"
                        />
                    </div>
                </div>

                <div className="modal-actions">
                    <button type="button" className="btn-secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button type="button" className="btn-primary" onClick={handleSave}>
                        Save Changes
                    </button>
                </div>
            </div>
        </div>
    );
}
