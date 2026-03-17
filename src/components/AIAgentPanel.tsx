import { useState, useRef, useEffect, useCallback } from 'react';
import type { ResumeData, AISettings } from '../types';
import { generateId } from '../types';
import { callAI, extractJSON } from '../services/aiService';

/* ─── Types ──────────────────────────────────────────────────── */

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

/* ─── Section detection ──────────────────────────────────────── */

const SECTION_KEYWORDS: Record<ResumeSection, string[]> = {
    summary:        ['summary', 'objective', 'about', 'intro', 'profile', 'overview', 'bio'],
    experience:     ['experience', 'job', 'work', 'role', 'position', 'duties', 'bullet', 'achievement', 'employer', 'company', 'career'],
    skills:         ['skill', 'technology', 'tech stack', 'tools', 'language', 'framework', 'competenc', 'proficien'],
    projects:       ['project', 'portfolio', 'side project', 'app', 'built', 'developed', 'github', 'demo'],
    certifications: ['cert', 'certification', 'license', 'credential', 'course', 'aws', 'google cert'],
    education:      ['education', 'degree', 'university', 'college', 'school', 'gpa', 'graduate', 'studied'],
    title:          ['title', 'job title', 'headline', 'designation', 'name', 'heading'],
    full:           ['everything', 'whole', 'entire', 'all section', 'full resume', 'complete', 'throughout'],
};

function detectSection(msg: string): ResumeSection {
    const lower = msg.toLowerCase();
    for (const [section, keywords] of Object.entries(SECTION_KEYWORDS)) {
        if (keywords.some(kw => lower.includes(kw))) return section as ResumeSection;
    }
    // Default: if message talks about quality/tone with no specific section, likely summary
    if (/punch|concis|strong|better|improv|rewrite|rewrit/.test(lower)) return 'summary';
    return 'full';
}

function getSectionLabel(s: ResumeSection): string {
    const map: Record<ResumeSection, string> = {
        summary: 'Summary', experience: 'Experience', skills: 'Skills',
        projects: 'Projects', certifications: 'Certifications',
        education: 'Education', title: 'Title', full: 'Full Resume',
    };
    return map[s];
}

const SECTION_ICONS: Record<ResumeSection, string> = {
    summary: '◎', experience: '◈', skills: '◇', projects: '◉',
    certifications: '◆', education: '○', title: '◐', full: '◌',
};

/* ─── Extract section data ───────────────────────────────────── */

function extractSection(resume: ResumeData, section: ResumeSection): unknown {
    switch (section) {
        case 'summary':        return resume.summary;
        case 'experience':     return resume.experiences;
        case 'skills':         return resume.skills;
        case 'projects':       return resume.projects;
        case 'certifications': return resume.certifications;
        case 'education':      return resume.education;
        case 'title':          return { fullName: resume.fullName, title: resume.title };
        case 'full':           return resume;
    }
}

/* ─── Apply patch safely ─────────────────────────────────────── */

function applyPatch(resume: ResumeData, patch: Partial<ResumeData>): ResumeData {
    const merged = { ...resume, ...patch };
    if (!merged.education?.length)      merged.education      = resume.education      ?? [];
    if (!merged.customSections?.length) merged.customSections = resume.customSections ?? [];
    if (!merged.certifications?.length) merged.certifications = resume.certifications ?? [];
    if (!merged.experiences?.length)    merged.experiences    = resume.experiences    ?? [];
    if (!merged.projects?.length)       merged.projects       = resume.projects       ?? [];
    return merged;
}

/* ─── AI call ────────────────────────────────────────────────── */

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
        summary:        '"patch": { "summary": "updated string" }',
        experience:     '"patch": { "experiences": [ ...complete updated array ] }',
        skills:         '"patch": { "skills": { ...updated skills object } }',
        projects:       '"patch": { "projects": [ ...complete updated array ] }',
        certifications: '"patch": { "certifications": [ ...complete updated array ] }',
        education:      '"patch": { "education": [ ...complete updated array ] }',
        title:          '"patch": { "fullName": "...", "title": "..." }',
        full:           '"patch": { ...complete ResumeData object }',
    };

    const prompt = `You are a precise AI resume editor. Edit ONLY the "${getSectionLabel(section)}" section.

SECTION DATA:
${JSON.stringify(sectionData, null, 2)}

${ctx ? `RECENT CONTEXT:\n${ctx}\n` : ''}REQUEST: ${request}

Instructions:
- Apply the change surgically. Keep tone professional.
- If editing experience, keep ALL jobs — only improve bullet points.
- If editing skills, keep all categories — only update values.

Return ONLY this JSON (no markdown, no extra text):
{
  "explanation": "One sentence describing what changed",
  "changes": ["Specific change 1", "Specific change 2"],
  ${returnFormats[section]}
}`;

    const raw = await callAI(prompt, settings);
    const parsed = JSON.parse(extractJSON(raw));
    return {
        explanation: parsed.explanation ?? 'Section updated.',
        changes:     Array.isArray(parsed.changes) ? parsed.changes : [],
        patch:       parsed.patch ?? {},
    };
}

/* ─── Helpers ────────────────────────────────────────────────── */

const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ─── Component ──────────────────────────────────────────────── */

export function AIAgentPanel({ resume, settings, onApply, onClose }: AIAgentPanelProps) {
    const [messages, setMessages] = useState<AgentMessage[]>([{
        id: 'welcome',
        role: 'agent',
        content: "I'll detect which section to edit automatically. Changes are previewed before applying — you stay in control.",
        timestamp: Date.now(),
    }]);
    const [input,     setInput]     = useState('');
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState('');
    const [minimized, setMinimized] = useState(false);

    const bottomRef  = useRef<HTMLDivElement>(null);
    const inputRef   = useRef<HTMLTextAreaElement>(null);
    const liveResume = useRef<ResumeData>(resume);
    useEffect(() => { liveResume.current = resume; }, [resume]);

    useEffect(() => {
        if (!minimized) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, minimized]);

    const history = useCallback(() =>
        messages
            .filter(m => m.id !== 'welcome')
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    , [messages]);

    const send = async (text?: string) => {
        const userText = (text ?? input).trim();
        if (!userText || loading) return;

        const section = detectSection(userText);

        setMessages(prev => [...prev, {
            id: generateId(), role: 'user', content: userText, timestamp: Date.now(),
        }]);
        setInput('');
        setLoading(true);
        setError('');
        if (minimized) setMinimized(false);

        try {
            const result = await callSectionEdit(
                liveResume.current, section, userText, history(), settings
            );
            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'agent',
                content: result.explanation,
                edit: {
                    section,
                    label: getSectionLabel(section),
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

    const approve = (msgId: string) => {
        let approved: SectionEdit | undefined;
        setMessages(prev => prev.map(m => {
            if (m.id !== msgId || !m.edit) return m;
            approved = m.edit;
            return { ...m, edit: { ...m.edit, status: 'approved' as ProposalStatus } };
        }));
        if (approved) {
            const next = applyPatch(liveResume.current, approved.patch);
            onApply(next, `[${approved.label}] ${approved.changes.join('; ')}`);
        }
        setMessages(prev => [...prev, {
            id: generateId(), role: 'agent',
            content: '✓ Applied. Revert anytime via Edit History.',
            timestamp: Date.now(),
        }]);
    };

    const reject = (msgId: string) => {
        setMessages(prev => prev.map(m =>
            m.id === msgId && m.edit
                ? { ...m, edit: { ...m.edit, status: 'rejected' as ProposalStatus } }
                : m
        ));
        setMessages(prev => [...prev, {
            id: generateId(), role: 'agent',
            content: "Discarded. What would you like differently?",
            timestamp: Date.now(),
        }]);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    /* ── FAB when minimised ── */
    if (minimized) {
        return (
            <button className="agent-fab" onClick={() => setMinimized(false)} title="Open AI Agent">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                    <circle cx="9" cy="14" r="1" /><circle cx="15" cy="14" r="1" />
                </svg>
                <span>AI Agent</span>
                {loading && <span className="agent-fab-pulse" />}
            </button>
        );
    }

    return (
        <div className="agent-float">

            {/* ── Header ── */}
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

            {/* ── Messages ── */}
            <div className="agf-msgs">
                {messages.map(msg => (
                    <div key={msg.id} className={`agf-msg agf-msg-${msg.role}`}>
                        {msg.role === 'agent' && <div className="agf-avatar-sm">✦</div>}
                        <div className="agf-msg-body">
                            <div className={`agf-bubble agf-bubble-${msg.role}`}>{msg.content}</div>

                            {/* Section badge on user messages */}
                            {msg.role === 'user' && msg.id !== 'welcome' && (
                                <div className="agf-section-pill">
                                    {SECTION_ICONS[detectSection(msg.content)]}
                                    <span>{getSectionLabel(detectSection(msg.content))}</span>
                                </div>
                            )}

                            {/* Proposal */}
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
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            )}

                            {msg.edit?.status === 'approved'  && <div className="agf-pstatus ok">✓ applied</div>}
                            {msg.edit?.status === 'rejected'  && <div className="agf-pstatus no">✕ discarded</div>}

                            <span className="agf-time">{fmtTime(msg.timestamp)}</span>
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="agf-msg agf-msg-agent">
                        <div className="agf-avatar-sm">✦</div>
                        <div className="agf-bubble agf-bubble-agent agf-typing">
                            <span /><span /><span />
                        </div>
                    </div>
                )}

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

            {/* ── Input ── */}
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
