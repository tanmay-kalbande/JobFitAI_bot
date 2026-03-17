import React from 'react';
import type { ResumeVersion } from '../types';

interface DashboardViewProps {
  groupedVersions: Record<string, ResumeVersion[]>;
  onSelectVersion: (version: ResumeVersion) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const DashboardView = ({
  groupedVersions,
  onSelectVersion,
  onExport,
  onImport,
}: DashboardViewProps) => {
  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header-bar">
        <div className="title-area">
          <h2>Company Dashboard</h2>
          <span className="subtitle">
            {Object.keys(groupedVersions).length} Companies tracked
          </span>
        </div>
        <div className="action-area">
          <button className="dashboard-action-btn" onClick={onExport}>
            Export Backup
          </button>
          <label className="dashboard-action-btn import-btn">
            Import Backup
            <input type="file" accept=".json" onChange={onImport} style={{ display: 'none' }} />
          </label>
        </div>
      </div>

      {Object.keys(groupedVersions).length === 0 ? (
        <div className="empty-dashboard">
          <div className="empty-dashboard-icon">◈</div>
          <h3>No company resumes created yet.</h3>
          <p>Tailor a resume for a position to see it listed here grouped by company name!</p>
        </div>
      ) : (
        <div className="dashboard-grid">
          {Object.entries(groupedVersions).map(([company, list]) => (
            <div className="company-card" key={company}>
              <div className="company-header">
                <div className="company-logo-placeholder">
                  {company[0].toUpperCase()}
                </div>
                <div className="company-info">
                  <h3>{company}</h3>
                  <span className="count-badge">{list.length} {list.length === 1 ? 'version' : 'versions'}</span>
                </div>
              </div>
              <div className="resumes-list">
                {list.map((v) => (
                  <div className="resume-item-card" key={v.id} onClick={() => onSelectVersion(v)}>
                    <div className="item-title">
                      <strong>{v.jobTitle || 'Position'}</strong>
                      <span className="item-date">{new Date(v.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="item-meta">
                      {v.modelUsed && <span className="model-tag">{v.modelUsed}</span>}
                      {v.alignmentScore !== undefined && (
                        <span className="score-tag" style={{ background: v.alignmentScore >= 80 ? '#10B98120' : '#F59E0B20', color: v.alignmentScore >= 80 ? '#10B981' : '#F59E0B' }}>
                          {v.alignmentScore}% Match
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
  );
};
