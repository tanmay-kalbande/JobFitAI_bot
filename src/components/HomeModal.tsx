import { useState, useMemo } from 'react';
import type { ResumeVersion } from '../types';
import { formatTimestamp } from '../types';

interface HomeModalProps {
    versions: ResumeVersion[];
    onClose: () => void;
    onSelectVersion: (version: ResumeVersion) => void;
    onDeleteVersion?: (id: string) => void;
    mode?: 'modal' | 'screen';
}

export function HomeModal({ versions, onClose, onSelectVersion, onDeleteVersion, mode = 'modal' }: HomeModalProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

    const groupedVersions = useMemo(() => {
        return versions.reduce((acc, curr) => {
            const company = curr.companyName?.trim() || 'General';
            if (!acc[company]) acc[company] = [];
            acc[company].push(curr);
            return acc;
        }, {} as Record<string, ResumeVersion[]>);
    }, [versions]);

    const companies = useMemo(() => Object.keys(groupedVersions).sort(), [groupedVersions]);

    const activeCompany = selectedCompany && groupedVersions[selectedCompany]
        ? selectedCompany
        : companies[0] ?? null;

    const filteredVersions = useMemo(() => {
        if (!activeCompany) return [];
        const list = groupedVersions[activeCompany] ?? [];
        if (!searchQuery.trim()) return list;
        const q = searchQuery.toLowerCase();
        return list.filter(v =>
            v.name.toLowerCase().includes(q) ||
            (v.jobTitle ?? '').toLowerCase().includes(q) ||
            (v.model ?? '').toLowerCase().includes(q)
        );
    }, [activeCompany, groupedVersions, searchQuery]);

    const typeLabel = (type: ResumeVersion['type']) => {
        if (type === 'tailored') return { icon: '✦', color: '#22c55e', label: 'Tailored' };
        if (type === 'cover-letter') return { icon: '✉', color: '#c26b2d', label: 'Cover Letter' };
        if (type === 'cv') return { icon: '▣', color: '#0f766e', label: 'CV' };
        if (type === 'fixed') return { icon: '⬡', color: '#f59e0b', label: 'Fixed' };
        return { icon: '○', color: '#9ca3b8', label: 'Base' };
    };

    const getVersionLabel = (version: ResumeVersion) => {
        const looksLikeSinglePage = version.type === 'base'
            && !!(version.companyName || version.jobTitle)
            && Array.isArray(version.changes)
            && version.changes.length > 0;
        if (version.documentLayout === 'single-page' || looksLikeSinglePage) {
            return { icon: '1P', color: '#38bdf8', label: 'One Page' };
        }
        return typeLabel(version.type);
    };

    const content = (
        <>
            <div className="modal-header hm-header">
                <div className="hm-header-left">
                    <h2>Document History</h2>
                    <p className="hm-subtitle">
                        {versions.length} document{versions.length !== 1 ? 's' : ''} &middot; {companies.length} compan{companies.length !== 1 ? 'ies' : 'y'}
                    </p>
                </div>
                <button className="close-btn" onClick={onClose}>×</button>
            </div>

            {versions.length === 0 ? (
                <div className="hm-empty">
                    <div className="hm-empty-icon">◈</div>
                    <p>No resumes yet</p>
                    <span>Generate or tailor a resume to see it here</span>
                </div>
            ) : (
                <>
                    <div className="hm-search-bar">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                        <input
                            className="hm-search-input"
                            type="text"
                            placeholder="Search by title or model..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="hm-search-clear" onClick={() => setSearchQuery('')}>×</button>
                        )}
                    </div>

                    <div className="hm-body">
                        <div className="hm-sidebar">
                            <div className="hm-sidebar-label">Companies</div>
                            {companies.map(company => (
                                <button
                                    key={company}
                                    className={`hm-company-tab ${activeCompany === company ? 'active' : ''}`}
                                    onClick={() => { setSelectedCompany(company); setSearchQuery(''); }}
                                >
                                    <span className="hm-ct-name" title={company}>{company}</span>
                                    <span className={`hm-ct-badge ${activeCompany === company ? 'active' : ''}`}>
                                        {groupedVersions[company].length}
                                    </span>
                                </button>
                            ))}
                        </div>

                        <div className="hm-list-panel">
                            {activeCompany && (
                                <div className="hm-list-header">
                                    <span className="hm-list-company">{activeCompany}</span>
                                    <span className="hm-list-count">
                                        {filteredVersions.length} / {groupedVersions[activeCompany]?.length ?? 0}
                                    </span>
                                </div>
                            )}
                            <div className="hm-list">
                                {filteredVersions.length === 0 ? (
                                    <div className="hm-list-empty">
                                        {searchQuery ? 'No results found' : 'No resumes here'}
                                    </div>
                                ) : (
                                    filteredVersions.map(version => {
                                        const t = getVersionLabel(version);
                                        return (
                                            <div
                                                key={version.id}
                                                className="hm-resume-row"
                                                onClick={() => { onSelectVersion(version); onClose(); }}
                                            >
                                                <span className="hm-rr-icon" style={{ color: t.color }}>{t.icon}</span>
                                                <div className="hm-rr-body">
                                                    <div className="hm-rr-top">
                                                        <strong className="hm-rr-title">
                                                            {version.jobTitle || 'General Application'}
                                                        </strong>
                                                        <span className="hm-rr-time">{formatTimestamp(version.timestamp)}</span>
                                                    </div>
                                                    <div className="hm-rr-meta">
                                                        <span
                                                            className="hm-rr-type-badge"
                                                            style={{ background: `${t.color}18`, color: t.color }}
                                                        >
                                                            {t.label}
                                                        </span>
                                                        {version.model && (
                                                            <span className="hm-rr-model">{version.model}</span>
                                                        )}
                                                        {version.alignmentScore != null && version.alignmentScore > 0 && (
                                                            <span
                                                                className="hm-rr-score"
                                                                style={{
                                                                    color: version.alignmentScore >= 70 ? '#22c55e' : version.alignmentScore >= 50 ? '#f59e0b' : '#ef4444'
                                                                }}
                                                            >
                                                                {version.alignmentScore}% match
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                {onDeleteVersion && (
                                                    <button
                                                        className="hm-rr-delete"
                                                        title="Delete"
                                                        onClick={e => { e.stopPropagation(); onDeleteVersion(version.id); }}
                                                    >
                                                        ×
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </>
            )}
        </>
    );

    if (mode === 'screen') {
        return (
            <section className="home-screen" aria-label="Document History">
                {content}
            </section>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div
                className="modal-content home-modal"
                onClick={e => e.stopPropagation()}
            >
                {content}
            </div>
        </div>
    );
}
