import { useState, useRef, useEffect, useCallback } from 'react';
import type { ResumeData, AISettings } from '../types';
import { generateId } from '../types';
import { callAI, extractJSON } from '../services/aiService';

/* ─── Types ──────────────────────────────────────────────── */

type ProposalStatus = 'pending' | 'approved' | 'rejected';

type ResumeSection =
    | 'summary' | 'experience' | 'skills' | 'projects'
    | 'certifications' | 'education' | 'title' | 'full';

interface SectionEdit {
    section: ResumeSection;
    label: string;
    patch: Partial<ResumeData>;
    changes: string[];
    status: ProposalStatus;
}

interface AgentMessage {
    id: string;
    role: 'user' | 'agent';
    content: string;
    edit?: SectionEdit;
    timestamp: number;
}

export interface AIAgentPanelProps {
    resume: ResumeData;
    settings: AISettings;
    onApply: (newResume: ResumeData, description: string) => void;
    onClose: () => void;
}

/* ─── Section detection (fuzzy + keyword) ────────────────── */

// Each entry: exact keywords + regex patterns for typo tolerance
const SECTION_PATTERNS: [ResumeSection, RegExp][] = [
    ['title',          /\btitle|headline|designation|job\s*title|full\s*name|heading\b/i],
    ['summary',        /\bsummar|summ?ery|about\s*me|objective|profile|overview|intro|bio\b/i],
    ['experience',     /\bexperience|exp\b|work|job|role|position|bullet|dut(y|ies)|achievement|employer|career|company\b/i],
    ['skills',         /\bskill|technolog|tech\s*stack|tool|language|framework|competen|proficien\b/i],
    ['projects',       /\bproject|portfolio|side\s*project|\bapp\b|built|developed|github|demo\b/i],
    ['certifications', /\bcertif|certif?ication|licen[sc]e|credential|course|aws\b|google\s*cert\b/i],
    ['education',      /\beducat|degree|university|college|school|gpa|graduat|studi\b/i],
    ['full',           /\beverything|whole\s*resume|entire|full\s*resume|complete\b/i],
];

function detectSection(msg: string): ResumeSection {
    for (const [section, pattern] of SECTION_PATTERNS) {
        if (pattern.test(msg)) return section;
    }
    // Tone/quality words without section → likely summary
    if (/punch|concis|shorter|longer|one.?lin|rewrite|better|improve|crip/i.test(msg)) {
        return 'summary';
    }
    return 'summary'; // safe default — editing summary is least destructive
}

const SECTION_LABELS: Record<ResumeSection, string> = {
    summary: 'Summary', experience: 'Experience', skills: 'Skills',
    projects: 'Projects', certifications: 'Certifications',
    education: 'Education', title: 'Title', full: 'Full Resume',
};

const SECTION_ICONS: Record<ResumeSection, string> = {
    summary: '◎', experience: '◈', skills: '◇', projects: '◉',
    certifications: '◆', education: '○', title: '◐', full: '◌',
};

/* ─── Extract section data ───────────────────────────────── */

function extractSection(resume: ResumeData, section: ResumeSection): unknown {
    switch (section) {
        case 'summary':        return { summary: resume.summary };
        case 'experience':     return { experiences: resume.experiences };
        case 'skills':         return { skills: resume.skills };
        case 'projects':       return { projects: resume.projects };
        case 'certifications': return { certifications: resume.certifications };
        case 'education':      return { education: resume.education };
        case 'title':          return { fullName: resume.fullName, title: resume.title };
        case 'full':           return resume;
    }
}

/* ─── Safe patch merge ───────────────────────────────────── */

function applyPatch(base: ResumeData, patch: Partial<ResumeData>): ResumeData {
    const merged: ResumeData = { ...base };

    // Only overwrite keys that exist in patch and have truthy/non-empty values
    for (const key of Object.keys(patch) as (keyof ResumeData)[]) {
        const val = patch[key];
        if (val === undefined || val === null) continue;

        // For arrays: only overwrite if patch has non-empty array
        if (Array.isArray(val)) {
            if (val.length > 0) (merged as Record<string, unknown>)[key] = val;
        }
        // For objects (skills, etc.): merge deeply
        else if (typeof val === 'object' && !Array.isArray(val)) {
            const existing = (base as Record<string, unknown>)[key];
            if (existing && typeof existing === 'object') {
                (merged as Record<string, unknown>)[key] = { ...existing as object, ...val as object };
            } else {
                (merged as Record<string, unknown>)[key] = val;
            }
        }
        // Strings/primitives: overwrite directly
        else if (typeof val === 'string' && val.trim().length > 0) {
            (merged as Record<string, unknown>)[key] = val;
        } else if (typeof val !== 'string') {
            (merged as Record<string, unknown>)[key] = val;
        }
    }

    // Safety: never drop critical arrays
    if (!merged.education?.length)      merged.education      = base.education      ?? [];
    if (!merged.customSections?.length) merged.customSections = base.customSections ?? [];
    if (!merged.certifications?.length) merged.certifications = base.certifications ?? [];
    if (!merged.experiences?.length)    merged.experiences    = base.experiences    ?? [];
    if (!merged.projects?.length)       merged.projects       = base.projects       ?? [];

    return merged;
}

/* ─── AI call (section-targeted) ────────────────────────── */

async function callSectionEdit(
    resume: ResumeData,
    section: ResumeSection,
    request: string,
    history: { role: string; content: string }[],
    settings: AISettings
): Promise<{ explanation: string; changes: string[]; patch: Partial<ResumeData> }> {
    const sectionData = extractSection(resume, section);
    const ctx = history.slice(-4).map(m =>
        `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`
    ).join('\n');

    const returnFormats: Record<ResumeSection, string> = {
        summary:        '{ "summary": "updated string here" }',
        experience:     '{ "experiences": [ ...complete updated array ] }',
        skills:         '{ "skills": { "languages": "...", "frameworks": "...", ... } }',
        projects:       '{ "projects": [ ...complete updated array ] }',
        certifications: '{ "certifications": [ ...complete updated array ] }',
        education:      '{ "education": [ ...complete updated array ] }',
        title:          '{ "fullName": "...", "title": "..." }',
        full:           '{ ...complete ResumeData }',
    };

    const prompt = `You are a precise AI resume editor. Edit ONLY the "${SECTION_LABELS[section]}" section.

CURRENT SECTION DATA:
${JSON.stringify(sectionData, null, 2)}

${ctx ? `CONTEXT:\n${ctx}\n` : ''}USER REQUEST: "${request}"

Apply exactly what was asked. Keep it professional and concise.
${section === 'experience' ? 'Keep ALL job entries. Only improve the bullet points.' : ''}
${section === 'skills' ? 'Keep ALL skill categories. Only update the values.' : ''}

Return ONLY this JSON (no markdown, no extra text):
{
  "explanation": "One clear sentence describing what changed",
  "changes": ["Specific change description"],
  "patch": ${returnFormats[section]}
}`;

    const raw = await callAI(prompt, settings);
    const text = raw.trim();

    let parsed: { explanation?: string; changes?: string[]; patch?: Partial<ResumeData> };
    try {
        parsed = JSON.parse(extractJSON(text));
    } catch {
        throw new Error('AI returned invalid JSON. Please try again.');
    }

    if (!parsed.patch) throw new Error('AI did not return a valid change. Please try again.');

    return {
        explanation: parsed.explanation ?? 'Section updated.',
        changes:     Array.isArray(parsed.changes) ? parsed.changes : [],
        patch:       parsed.patch,
    };
}

/* ─── Helpers ────────────────────────────────────────────── */

const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ─── Component ──────────────────────────────────────────── */

export function AIAgentPanel({ resume, settings, onApply, onClose }: AIAgentPanelProps) {
    const [messages, setMessages] = useState<AgentMessage[]>([{
        id: 'welcome',
        role: 'agent',
        content: "I auto-detect which section to edit from your message. Every change is shown as a preview — nothing is applied until you approve.",
        timestamp: Date.now(),
    }]);
    const [input,     setInput]     = useState('');
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState('');
    const [minimized, setMinimized] = useState(false);

    const bottomRef  = useRef<HTMLDivElement>(null);
    const inputRef   = useRef<HTMLTextAreaElement>(null);

    // Always keep the freshest resume in a ref for async callbacks
    const liveResume = useRef<ResumeData>(resume);
    useEffect(() => { liveResume.current = resume; }, [resume]);

    // Scroll to bottom on new messages
    useEffect(() => {
        if (!minimized) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    }, [messages, minimized]);

    const getHistory = useCallback(() =>
        messages
            .filter(m => m.id !== 'welcome')
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    , [messages]);

    /* Send ─────────────────────────────────────────────── */
    const send = async (text?: string) => {
        const userText = (text ?? input).trim();
        if (!userText || loading) return;

        const section = detectSection(userText);
        const userMsgId = generateId();

        setMessages(prev => [...prev, {
            id: userMsgId, role: 'user', content: userText, timestamp: Date.now(),
        }]);
        setInput('');
        setLoading(true);
        setError('');
        if (minimized) setMinimized(false);

        try {
            const result = await callSectionEdit(
                liveResume.current, section, userText, getHistory(), settings
            );
            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'agent',
                content: result.explanation,
                edit: {
                    section,
                    label: SECTION_LABELS[section],
                    patch: result.patch,
                    changes: result.changes,
                    status: 'pending',
                },
                timestamp: Date.now(),
            }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
        } finally {
            setLoading(false);
        }
    };

    /* Approve ── FIX: find message first, apply synchronously ── */
    const approve = useCallback((msgId: string) => {
        // Find the message directly from state snapshot — avoids setState callback race
        setMessages(prev => {
            const msg = prev.find(m => m.id === msgId);
            if (!msg?.edit || msg.edit.status !== 'pending') return prev;

            // Apply patch and call onApply synchronously here
            const newResume = applyPatch(liveResume.current, msg.edit.patch);
            onApply(newResume, `[${msg.edit.label}] ${msg.edit.changes.join('; ')}`);

            const updated = prev.map(m =>
                m.id === msgId
                    ? { ...m, edit: { ...m.edit!, status: 'approved' as ProposalStatus } }
                    : m
            );

            return [
                ...updated,
                {
                    id: generateId(),
                    role: 'agent' as const,
                    content: '✓ Applied. Revert anytime via Edit History.',
                    timestamp: Date.now(),
                },
            ];
        });
    }, [onApply]);

    /* Reject ─────────────────────────────────────────── */
    const reject = useCallback((msgId: string) => {
        setMessages(prev => {
            const updated = prev.map(m =>
                m.id === msgId && m.edit
                    ? { ...m, edit: { ...m.edit, status: 'rejected' as ProposalStatus } }
                    : m
            );
            return [
                ...updated,
                {
                    id: generateId(),
                    role: 'agent' as const,
                    content: "Discarded. What would you like differently?",
                    timestamp: Date.now(),
                },
            ];
        });
    }, []);

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    /* FAB ────────────────────────────────────────────── */
    if (minimized) {
        return (
            <button className="agent-fab" onClick={() => setMinimized(false)} title="Open AI Agent">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    <circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" />
                </svg>
                <span>AI Agent</span>
                {loading && <span className="agent-fab-pulse" />}
            </button>
        );
    }

    /* Panel ──────────────────────────────────────────── */
    return (
        <div className="agent-float">

            {/* Header */}
            <div className="agf-header">
                <div className="agf-header-left">
                    <div className="agf-avatar">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                            <circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" />
                        </svg>
                    </div>
                    <div>
                        <div className="agf-name">Resume Agent</div>
                        <div className={`agf-state ${loading ? 'busy' : 'idle'}`}>
                            <span className="agf-state-dot" />
                            {loading ? 'thinking…' : 'ready'}
                        </div>
                    </div>
                </div>
                <div className="agf-hbtns">
                    <button className="agf-hbtn" onClick={() => setMinimized(true)} title="Minimise">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                    <button className="agf-hbtn" onClick={onClose} title="Close">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Messages */}
            <div className="agf-msgs">
                {messages.map(msg => (
                    <div key={msg.id} className={`agf-msg agf-msg-${msg.role}`}>
                        {msg.role === 'agent' && <div className="agf-avatar-sm">✦</div>}
                        <div className="agf-msg-body">

                            <div className={`agf-bubble agf-bubble-${msg.role}`}>
                                {msg.content}
                            </div>

                            {/* Section pill — shown on user messages */}
                            {msg.role === 'user' && msg.id !== 'welcome' && (
                                <div className="agf-section-pill">
                                    {SECTION_ICONS[detectSection(msg.content)]}
                                    <span>{SECTION_LABELS[detectSection(msg.content)]}</span>
                                </div>
                            )}

                            {/* Proposal card */}
                            {msg.edit?.status === 'pending' && (
                                <div className="agf-proposal">
                                    <div className="agf-proposal-top">
                                        <span className="agf-psection">
                                            {SECTION_ICONS[msg.edit.section]} {msg.edit.label}
                                        </span>
                                        <span className="agf-pbadge">draft</span>
                                    </div>
                                    <ul className="agf-plist">
                                        {msg.edit.changes.map((c, i) => <li key={i}>{c}</li>)}
                                    </ul>
                                    <div className="agf-pbtns">
                                        <button className="agf-papply" onClick={() => approve(msg.id)}>
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                            Apply
                                        </button>
                                        <button className="agf-pdiscard" onClick={() => reject(msg.id)}>
                                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6"  y1="6" x2="18" y2="18" />
                                            </svg>
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            )}

                            {msg.edit?.status === 'approved' && (
                                <div className="agf-pstatus ok">✓ applied</div>
                            )}
                            {msg.edit?.status === 'rejected' && (
                                <div className="agf-pstatus no">✕ discarded</div>
                            )}

                            <span className="agf-time">{fmtTime(msg.timestamp)}</span>
                        </div>
                    </div>
                ))}

                {/* Typing indicator */}
                {loading && (
                    <div className="agf-msg agf-msg-agent">
                        <div className="agf-avatar-sm">✦</div>
                        <div className="agf-bubble agf-bubble-agent agf-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="agf-err">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="13" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                        {error}
                        <button onClick={() => setError('')}>×</button>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="agf-input-wrap">
                <textarea
                    ref={inputRef}
                    className="agf-input"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={onKeyDown}
                    placeholder="e.g. make summary punchier, quantify experience bullets…"
                    rows={2}
                    disabled={loading}
                />
                <button
                    className="agf-send"
                    onClick={() => send()}
                    disabled={loading || !input.trim()}
                    title="Send (Enter)"
                >
                    {loading
                        ? <span className="agf-spinner" />
                        : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
