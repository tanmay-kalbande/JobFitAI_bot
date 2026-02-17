import type { ResumeVersion } from '../types';
import { formatTimestamp } from '../types';

interface VersionHistoryProps {
    versions: ResumeVersion[];
    currentVersionId: string | null;
    onSelectVersion: (version: ResumeVersion) => void;
    onDeleteVersion: (id: string) => void;
}

export function VersionHistory({
    versions,
    currentVersionId,
    onSelectVersion,
    onDeleteVersion,
}: VersionHistoryProps) {
    if (versions.length === 0) {
        return (
            <div className="version-empty">
                <p>No saved versions yet</p>
            </div>
        );
    }

    return (
        <div className="version-list">
            {versions.map((version) => (
                <div
                    key={version.id}
                    className={`version-item ${currentVersionId === version.id ? 'active' : ''}`}
                    onClick={() => onSelectVersion(version)}
                >
                    <div className="version-header">
                        <span className={`version-type ${version.type}`}>
                            {version.type === 'tailored' ? '✦' : '○'}
                        </span>
                        <span className="version-name">{version.name}</span>
                    </div>
                    <div className="version-meta">
                        <span className="version-time">{formatTimestamp(version.timestamp)}</span>
                        <button
                            className="version-delete"
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteVersion(version.id);
                            }}
                            title="Delete version"
                        >
                            ×
                        </button>
                    </div>
                    {version.changes && version.changes.length > 0 && (
                        <div className="version-changes">
                            {version.changes.slice(0, 2).map((change, i) => (
                                <div key={i} className="change-item">• {change}</div>
                            ))}
                            {version.changes.length > 2 && (
                                <div className="change-more">+{version.changes.length - 2} more</div>
                            )}
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
