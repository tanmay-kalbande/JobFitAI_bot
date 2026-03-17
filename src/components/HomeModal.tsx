import React, { useState } from 'react';
import type { ResumeVersion } from '../types';
import { formatTimestamp } from '../types';

interface HomeModalProps {
    versions: ResumeVersion[];
    onClose: () => void;
    onSelectVersion: (version: ResumeVersion) => void;
}

export function HomeModal({ versions, onClose, onSelectVersion }: HomeModalProps) {
    // Group versions by company
    const groupedVersions = versions.reduce((acc, curr) => {
        const company = curr.companyName?.trim() || 'General Resumes';
        if (!acc[company]) {
            acc[company] = [];
        }
        acc[company].push(curr);
        return acc;
    }, {} as Record<string, ResumeVersion[]>);

    const companies = Object.keys(groupedVersions).sort();

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content home-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '90%' }}>
                <div className="modal-header">
                    <div>
                        <h2>Resume History Dashboard</h2>
                        <p style={{ fontSize: '0.85rem', color: '#828a9e', marginTop: '0.25rem' }}>
                            View and manage all resumes you've generated, grouped by company.
                        </p>
                    </div>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="modal-scroll-area" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', background: '#f8f9fc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                    {companies.length === 0 ? (
                        <div className="empty-state" style={{ textAlign: 'center', padding: '3rem', color: '#828a9e' }}>
                            <p>No resume history found. Start tailoring resumes to see them here!</p>
                        </div>
                    ) : (
                        <div className="company-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '1.5rem'
                        }}>
                            {companies.map(company => (
                                <div key={company} className="company-card" style={{
                                    background: '#ffffff',
                                    borderRadius: '12px',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                                    overflow: 'hidden',
                                    border: '1px solid #e1e4ed'
                                }}>
                                    <div className="company-card-header" style={{
                                        borderBottom: '1px solid #e1e4ed',
                                        padding: '1rem',
                                        background: company === 'General Resumes' ? 'linear-gradient(135deg, #f0f2fb, #e4e7f5)' : 'linear-gradient(135deg, #2d2d3f, #1a1a2e)',
                                        color: company === 'General Resumes' ? '#4a5568' : '#ffffff'
                                    }}>
                                        <h3 style={{ margin: 0, fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                            {company}
                                            <span style={{
                                                fontSize: '0.75rem', 
                                                background: company === 'General Resumes' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.2)',
                                                padding: '2px 8px', 
                                                borderRadius: '12px' 
                                            }}>
                                                {groupedVersions[company].length} Resumes
                                            </span>
                                        </h3>
                                    </div>
                                    <div className="company-card-body" style={{ padding: '0.5rem 0' }}>
                                        {groupedVersions[company].map(version => (
                                            <div 
                                                key={version.id} 
                                                className="version-row"
                                                onClick={() => {
                                                    onSelectVersion(version);
                                                    onClose();
                                                }}
                                                style={{
                                                    padding: '0.75rem 1rem',
                                                    borderBottom: '1px solid #f1f3f7',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '0.25rem'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <strong style={{ fontSize: '0.9rem', color: '#1a202c' }}>{version.name}</strong>
                                                    <span style={{ fontSize: '0.75rem', color: '#718096' }}>{formatTimestamp(version.timestamp)}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#4a5568' }}>
                                                    <span>{version.jobTitle || 'General Application'}</span>
                                                    {version.model && (
                                                        <span style={{ 
                                                            fontSize: '0.65rem',
                                                            background: '#e2e8f0',
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            color: '#4a5568'
                                                        }}>
                                                            {version.model}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
