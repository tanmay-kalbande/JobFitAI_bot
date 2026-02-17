import type { ResumeAnalysis } from '../services/analysisService';
import { getScoreColor } from '../utils/scoreUtils';

interface AnalysisModalProps {
    analysis: ResumeAnalysis;
    onClose: () => void;
    onFix: () => void;
    isFixing?: boolean;
}

export function AnalysisModal({ analysis, onClose, onFix, isFixing }: AnalysisModalProps) {
    const hasIssues = analysis.weaknesses.length > 0 || analysis.improvements.length > 0;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content analysis-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Resume Analysis</h2>
                    <button className="close-btn" onClick={onClose}>×</button>
                </div>

                <div className="analysis-body">
                    <div className="score-section">
                        <div className="score-circle" style={{ borderColor: getScoreColor(analysis.score) }}>
                            <span className="score-value" style={{ color: getScoreColor(analysis.score) }}>
                                {analysis.score}
                            </span>
                            <span className="score-label">Score</span>
                        </div>
                        <p className="analysis-summary">{analysis.summary}</p>
                    </div>

                    <div className="analysis-grid">
                        <div className="analysis-card strengths">
                            <h3>Strength</h3>
                            <ul>
                                {analysis.strengths.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>

                        <div className="analysis-card weaknesses">
                            <h3>Weaknesses</h3>
                            <ul>
                                {analysis.weaknesses.map((item, i) => (
                                    <li key={i}>{item}</li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <div className="improvements-section">
                        <h3>Recommended Improvements</h3>
                        <ul>
                            {analysis.improvements.map((item, i) => (
                                <li key={i}>{item}</li>
                            ))}
                        </ul>
                    </div>

                    {hasIssues && (
                        <div className="fix-section">
                            <button
                                className="btn-fix"
                                onClick={onFix}
                                disabled={isFixing}
                            >
                                {isFixing ? (
                                    <>
                                        <span className="spinner-small"></span>
                                        Fixing Issues...
                                    </>
                                ) : (
                                    <>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path>
                                        </svg>
                                        Fix All Issues
                                    </>
                                )}
                            </button>
                            <p className="fix-hint">AI will automatically fix all weaknesses and implement improvements</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

