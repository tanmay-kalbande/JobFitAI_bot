import { useState } from 'react';
import type { ResumeVersion } from '../types';

interface DashboardViewProps {
  groupedVersions: Record<string, ResumeVersion[]>;
  onSelectVersion: (version: ResumeVersion) => void;
}

export const DashboardView = ({
  groupedVersions,
  onSelectVersion,
}: DashboardViewProps) => {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null);

  const handleCompanyClick = (company: string) => {
    setSelectedCompany(company);
  };

  const closeModal = () => {
    setSelectedCompany(null);
  };

  return (
    <div className="dashboard-wrapper">
      <div className="dashboard-header-bar">
        <div className="title-area">
          <h2>Company Dashboard</h2>
          <span className="subtitle">
            {Object.keys(groupedVersions).length} {Object.keys(groupedVersions).length === 1 ? 'Company' : 'Companies'} tracked
          </span>
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
            <div 
              className="company-card compact" 
              key={company}
              onClick={() => handleCompanyClick(company)}
            >
              <div className="company-logo-placeholder">
                {company[0].toUpperCase()}
              </div>
              <div className="company-info">
                <h3>{company}</h3>
                <span className="count-badge">{list.length} {list.length === 1 ? 'version' : 'versions'}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedCompany && (
        <div className="db-modal-overlay" onClick={closeModal}>
          <div className="db-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="db-modal-header">
              <div className="db-modal-title">
                <div className="company-logo-placeholder">
                  {selectedCompany[0].toUpperCase()}
                </div>
                <h3>{selectedCompany}</h3>
              </div>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>
            
            <div className="db-modal-body">
              <span className="modal-subtitle">Resume Versions</span>
              <div className="resumes-list">
                {groupedVersions[selectedCompany].map((v) => (
                  <div className="resume-item-card" key={v.id} onClick={() => { onSelectVersion(v); closeModal(); }}>
                    <div className="item-title">
                      <strong>{v.jobTitle || 'Position'}</strong>
                      <span className="item-date">{new Date(v.timestamp).toLocaleDateString()}</span>
                    </div>
                    <div className="item-meta">
                      {v.modelUsed && <span className="model-tag">{v.modelUsed}</span>}
                      {v.alignmentScore !== undefined && (
                        <span className="score-tag" style={{ background: v.alignmentScore >= 80 ? '#10B98115' : '#F59E0B15', color: v.alignmentScore >= 80 ? '#10B981' : '#F59E0B' }}>
                          {v.alignmentScore}% Match
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
