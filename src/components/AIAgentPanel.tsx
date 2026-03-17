import { useState, useRef, useEffect, useCallback } from 'react';
import type { ResumeData, AISettings } from '../types';
import { generateId } from '../types';
import { callAI, extractJSON } from '../services/aiService';

/* ─── Types ─────────────────────────────────────────────── */

type ProposalStatus = 'pending' | 'approved' | 'rejected';

interface Proposal {
    resume: ResumeData;
    changes: string[];
    status: ProposalStatus;
}

interface AgentMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
    proposal?: Proposal;
    timestamp: number;
}

export interface AIAgentPanelProps {
    resume: ResumeData;
    settings: AISettings;
    onApply: (newResume: ResumeData, description: string) => void;
    onClose: () => void;
}

/* ─── Chips ─────────────────────────────────────────────── */

const CHIPS = [
    'Make my summary more concise',
    'Add stronger action verbs',
    'Quantify my bullet points',
    'Improve the skills section',
    'Tailor summary for a data role',
    'Remove filler words',
];

/* ─── AI call ───────────────────────────────────────────── */

async function callAgentEdit(
    resume: ResumeData,
    request: string,
    history: { role: string; content: string }[],
    settings: AISettings
): Promise<{ explanation: string; changes: string[]; resume: ResumeData }> {
    const ctx = history
        .slice(-6)
        .map(m => `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`)
        .join('\n');

    const prompt = `You are an expert AI resume editor.

CURRENT RESUME (JSON):
${JSON.stringify(resume, null, 2)}

${ctx ? `RECENT CONVERSATION:\n${ctx}\n\n` : ''}USER REQUEST: ${request}

Make only the changes requested. Preserve everything else exactly.

Return ONLY valid JSON (no markdown fences):
{
  "explanation": "1-2 sentence plain-English description of what you changed",
  "changes": ["Change 1", "Change 2"],
  "resume": { ...complete updated resume object }
}

RULES:
- Return ONLY the JSON object.
- Preserve education, certifications, customSections, projects unless asked to change them.
- "changes" = 2-5 short strings.`;

    const raw = await callAI(prompt, settings);
    const result = JSON.parse(extractJSON(raw));

    if (!result.resume.education?.length)      result.resume.education      = resume.education      ?? [];
    if (!result.resume.customSections?.length) result.resume.customSections = resume.customSections ?? [];
    if (!result.resume.certifications?.length) result.resume.certifications = resume.certifications ?? [];

    return {
        explanation: result.explanation ?? 'Resume updated.',
        changes:     Array.isArray(result.changes) ? result.changes : [],
        resume:      result.resume,
    };
}

const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ─── Component ─────────────────────────────────────────── */

export function AIAgentPanel({ resume, settings, onApply, onClose }: AIAgentPanelProps) {
    const [messages, setMessages] = useState<AgentMessage[]>([{
        id: 'welcome',
        role: 'agent',
        content: "Hi! I'm your resume editing agent. Describe any change you want — I'll propose edits for you to review before anything is applied. You can revert any change from the History panel.",
        timestamp: Date.now(),
    }]);
    const [input,   setInput]   = useState('');
    const [loading, setLoading] = useState(false);
    const [error,   setError]   = useState('');

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef  = useRef<HTMLTextAreaElement>(null);
    const liveResume = useRef<ResumeData>(resume);
    useEffect(() => { liveResume.current = resume; }, [resume]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const history = useCallback(() =>
        messages
            .filter(m => m.id !== 'welcome')
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    , [messages]);

    const send = async (text?: string) => {
        const userText = (text ?? input).trim();
        if (!userText || loading) return;
        setMessages(prev => [...prev, { id: generateId(), role: 'user', content: userText, timestamp: Date.now() }]);
        setInput('');
        setLoading(true);
        setError('');
        try {
            const result = await callAgentEdit(liveResume.current, userText, history(), settings);
            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'agent',
                content: result.explanation,
                proposal: { resume: result.resume, changes: result.changes, status: 'pending' },
                timestamp: Date.now(),
            }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const approve = (msgId: string) => {
        let approved: Proposal | undefined;
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId || !m.proposal) return m;
            approved = m.proposal;
            return { ...m, proposal: { ...m.proposal, status: 'approved' as ProposalStatus } };
        }));
        if (approved) onApply(approved.resume, approved.changes.join('; '));
        setMessages(prev => [...prev, {
            id: generateId(), role: 'agent',
            content: '✓ Changes applied to your resume. You can revert anytime from the History panel.',
            timestamp: Date.now(),
        }]);
    };

    const reject = (msgId: string) => {
        setMessages(prev => prev.map(m =>
            m.id === msgId && m.proposal
                ? { ...m, proposal: { ...m.proposal, status: 'rejected' as ProposalStatus } }
                : m
        ));
        setMessages(prev => [...prev, {
            id: generateId(), role: 'agent',
            content: "No problem — discarded. Tell me what you'd like differently.",
            timestamp: Date.now(),
        }]);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    const showChips = messages.filter(m => m.role === 'user').length === 0;

    return (
        <div className="agent-panel">

            {/* Header */}
            <div className="agent-header">
                <div className="agent-header-left">
                    <div className="agent-avatar">✦</div>
                    <div>
                        <div className="agent-title">AI Resume Agent</div>
                        <div className="agent-status">
                            {loading
                                ? <><span className="agent-status-dot loading" />Thinking…</>
                                : <><span className="agent-status-dot online"  />Ready</>
                            }
                        </div>
                    </div>
                </div>
                <button className="agent-close-btn" onClick={onClose} title="Close">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6"  x2="6"  y2="18" />
                        <line x1="6"  y1="6"  x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div className="agent-messages">
                {messages.map(msg => (
                    <div key={msg.id} className={`agent-msg agent-msg-${msg.role}`}>
                        {msg.role === 'agent' && <div className="agent-bubble-icon">✦</div>}
                        <div className="agent-bubble-wrap">

                            <div className={`agent-bubble ${msg.role === 'agent' ? 'ai' : 'user'}`}>
                                {msg.content}
                            </div>

                            {msg.proposal?.status === 'pending' && (
                                <div className="agent-proposal">
                                    <div className="proposal-header">
                                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                                        </svg>
                                        Proposed changes
                                    </div>
                                    <ul className="proposal-changes">
                                        {msg.proposal.changes.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                    <div className="proposal-actions">
                                        <button className="proposal-btn approve" onClick={() => approve(msg.id)}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Apply changes
                                        </button>
                                        <button className="proposal-btn reject" onClick={() => reject(msg.id)}>
                                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6"  y1="6" x2="18" y2="18" />
                                            </svg>
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            )}

                            {msg.proposal?.status === 'approved' && (
                                <div className="proposal-status approved">✓ Applied to resume</div>
                            )}
                            {msg.proposal?.status === 'rejected' && (
                                <div className="proposal-status rejected">✕ Discarded</div>
                            )}

                            <div className="agent-time">{fmtTime(msg.timestamp)}</div>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="agent-msg agent-msg-agent">
                        <div className="agent-bubble-icon">✦</div>
                        <div className="agent-bubble ai agent-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                {error && (
                    <div className="agent-error">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8"  x2="12"    y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                        <button onClick={() => setError('')}>×</button>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Suggestion chips */}
            {showChips && (
                <div className="agent-suggestions">
                    {CHIPS.map(s => (
                        <button key={s} className="agent-chip" onClick={() => send(s)} disabled={loading}>
                            {s}
                        </button>
                    ))}
                </div>
            )}

            {/* Input */}
            <div className="agent-input-area">
                <textarea
                    ref={inputRef}
                    className="agent-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Describe what to change… (Enter to send)"
                    rows={2}
                    disabled={loading}
                />
                <button
                    className="agent-send-btn"
                    onClick={() => send()}
                    disabled={loading || !input.trim()}
                    title="Send"
                >
                    {loading
                        ? <span className="agent-spinner" />
                        : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="22" y1="2" x2="11" y2="13" />
                                <polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                        )
                    }
                </button>
            </div>
        </div>
    );
}
