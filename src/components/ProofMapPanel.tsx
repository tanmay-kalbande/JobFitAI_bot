import type { ProofMapItem, ResumeVersion } from '../types';

interface ProofMapPanelProps {
    version: ResumeVersion;
    onClose: () => void;
    fullView?: boolean;
}

function countByStrength(items: ProofMapItem[], strength: ProofMapItem['strength']): number {
    return items.filter(item => item.strength === strength).length;
}

export function ProofMapPanel({ version, onClose, fullView = false }: ProofMapPanelProps) {
    const proofMap = version.proofMap || [];
    const strongCount = countByStrength(proofMap, 'strong');
    const moderateCount = countByStrength(proofMap, 'moderate');
    const gapCount = countByStrength(proofMap, 'gap');

    return (
        <div className={`proof-map-panel ${fullView ? 'proof-map-panel-full' : ''}`}>
            <div className="changes-header">
                <h3>
                    <span className="changes-icon">◎</span>
                    Proof Map
                    {version.companyName && <span className="changes-company">for {version.companyName}</span>}
                </h3>
                <button className="close-btn-small" onClick={onClose}>×</button>
            </div>

            <div className="proof-map-summary">
                <div className="proof-map-chip strong">{strongCount} strong</div>
                <div className="proof-map-chip moderate">{moderateCount} moderate</div>
                <div className="proof-map-chip gap">{gapCount} gaps</div>
            </div>

            <div className="proof-map-list">
                {proofMap.length === 0 ? (
                    <div className="proof-map-empty">
                        No proof mapping is available for this version yet.
                    </div>
                ) : (
                    proofMap.map((item, index) => (
                        <div key={`${item.requirement}-${index}`} className={`proof-map-card ${item.strength}`}>
                            <div className="proof-map-top">
                                <span className={`proof-map-badge ${item.strength}`}>{item.strength}</span>
                                <span className="proof-map-source">{item.sourceSection}</span>
                            </div>
                            <div className="proof-map-requirement">{item.requirement}</div>
                            <div className="proof-map-evidence">{item.evidence}</div>
                            {item.reasoning && (
                                <div className="proof-map-reasoning">{item.reasoning}</div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
