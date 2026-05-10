import type { ResumeEditLog } from '../types';
import { formatTimestamp } from '../types';

interface EditHistoryPanelProps {
    editLogs: ResumeEditLog[];
    onRevert: (log: ResumeEditLog) => void;
    onClose: () => void;
}

export function EditHistoryPanel({ editLogs, onRevert, onClose }: EditHistoryPanelProps) {
    if (editLogs.length === 0) {
        return (
            <div className="edit-history-panel">
                <div className="edit-history-header">
                    <h3>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 3v5h5" />
                            <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                            <path d="M12 7v5l4 2" />
                        </svg>
                        Edit History
                    </h3>
                    <button className="close-btn-small" onClick={onClose}>×</button>
                </div>
                <div className="edit-history-empty">
                    <p>No manual edits yet</p>
                    <span>Use Quick Edit to make changes</span>
                </div>
            </div>
        );
    }

    return (
        <div className="edit-history-panel">
            <div className="edit-history-header">
                <h3>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 3v5h5" />
                        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                        <path d="M12 7v5l4 2" />
                    </svg>
                    Edit History
                    <span className="edit-count">{editLogs.length}</span>
                </h3>
                <button className="close-btn-small" onClick={onClose}>×</button>
            </div>
            <div className="edit-history-list">
                {editLogs.map((log) => (
                    <div key={log.id} className="edit-history-item">
                        <div className="edit-item-info">
                            <span className="edit-item-desc">{log.description}</span>
                            <span className="edit-item-time">{formatTimestamp(log.timestamp)}</span>
                        </div>
                        <button
                            className="edit-revert-btn"
                            onClick={() => onRevert(log)}
                            title="Revert to this state"
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 3v5h5" />
                                <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
                            </svg>
                            Revert
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
