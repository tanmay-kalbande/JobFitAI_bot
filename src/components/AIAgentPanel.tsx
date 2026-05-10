import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
    detectedSection?: ResumeSection;
    timestamp: number;
}

export interface AIAgentPanelProps {
    resume: ResumeData;
    settings: AISettings;
    onApply: (newResume: ResumeData, description: string) => void;
    onClose: () => void;
}

/* ─── Section detection - handles negation & context ─────── */

// Maps display labels to sections (for "in experience section", "the skills tab", etc.)
const SECTION_ALIASES: [ResumeSection, RegExp][] = [
    ['title',          /\b(title|headline|designation|name|job\s*title)\b/i],
    ['experience',     /\b(experience|exp|work|job|role|position|bullets?|dut(y|ies)|achievements?|career|employer|company)\b/i],
    ['skills',         /\b(skills?|technolog|tech\s*stack|tools?|languages?|frameworks?|competen|proficien)\b/i],
    ['projects',       /\b(projects?|portfolio|apps?|built|developed|github|demos?)\b/i],
    ['certifications', /\b(certif|licen[sc]e|credential|courses?|aws|google\s*cert)\b/i],
    ['education',      /\b(educat|degree|university|college|school|gpa|graduat|studi)\b/i],
    ['summary',        /\b(summar|about\s*me|objective|profile|overview|intro|bio|professional\s*summary)\b/i],
    ['full',           /\b(everything|whole\s*resume|entire|full\s*resume|complete|all\s*sections?)\b/i],
];

// Tone/quality words that point to a section when used alone
const TONE_KEYWORDS = /\b(punch|concis|shorter|longer|one.?lin|rewrite|better|improve|crisp|stronger|action\s*verbs?|quantif|numbers?|metrics?|impact)\b/i;

/**
 * Detect section with negation handling.
 * "not in summary, in experience" → experience
 * "summery" without negation → summary
 */
function detectSection(msg: string, previousSection?: ResumeSection): ResumeSection {
    const lower = msg.toLowerCase();

    // 1. Check for explicit negation patterns: "not in X", "not X", "wrong X section"
    //    Strip the negated section from the string, then detect on the remainder
    const negationPattern = /\b(?:not?\s+in|not\s+the|wrong|don['']?t\s+(?:touch|edit|change)|skip)\s+(\w[\w\s]*?)(?:\s+(?:section|tab|part))?\b/gi;
    let cleanMsg = lower;
    let match: RegExpExecArray | null;
    while ((match = negationPattern.exec(lower)) !== null) {
        cleanMsg = cleanMsg.replace(match[0], ' ').trim();
    }

    // 2. Also handle "in the X section/tab" explicit routing
    const explicitIn = /\b(?:in\s+(?:the\s+)?|(?:the\s+)?)\b(experience|skills?|projects?|certif|educat|title|summary|work|job)\b/i.exec(cleanMsg);
    if (explicitIn) {
        const word = explicitIn[1].toLowerCase();
        if (/experi|work|job/.test(word))   return 'experience';
        if (/skill/.test(word))             return 'skills';
        if (/project/.test(word))           return 'projects';
        if (/certif/.test(word))            return 'certifications';
        if (/educat/.test(word))            return 'education';
        if (/title/.test(word))             return 'title';
        if (/summar/.test(word))            return 'summary';
    }

    // 3. Score-based detection on cleanMsg
    const scores: Partial<Record<ResumeSection, number>> = {};
    for (const [section, pattern] of SECTION_ALIASES) {
        const matches = cleanMsg.match(new RegExp(pattern.source, 'gi'));
        if (matches) {
            scores[section] = (scores[section] ?? 0) + matches.length;
        }
    }

    if (Object.keys(scores).length > 0) {
        // Return highest scoring section
        return (Object.entries(scores) as [ResumeSection, number][])
            .sort((a, b) => b[1] - a[1])[0][0];
    }

    // 4. Tone words alone → same section as previous, or ask via experience (not summary default)
    if (TONE_KEYWORDS.test(cleanMsg)) {
        return previousSection ?? 'experience';
    }

    // 5. If message is very short and conversational (correction), keep previous section
    if (cleanMsg.split(/\s+/).length <= 6 && previousSection) {
        return previousSection;
    }

    // 6. Safe default: unknown → let AI pick (send full context)
    return 'full';
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
    const merged = { ...base } as unknown as Record<string, unknown>;
    const baseMap = base as unknown as Record<string, unknown>;

    for (const key of Object.keys(patch) as (keyof ResumeData)[]) {
        const val = patch[key] as unknown;
        if (val === undefined || val === null) continue;
        if (Array.isArray(val)) {
            if (val.length > 0) merged[key] = val;
        } else if (typeof val === 'object') {
            const existing = baseMap[key];
            if (existing && typeof existing === 'object' && !Array.isArray(existing)) {
                merged[key] = { ...(existing as object), ...(val as object) };
            } else {
                merged[key] = val;
            }
        } else if (typeof val === 'string') {
            if (val.trim().length > 0) merged[key] = val;
        } else {
            merged[key] = val;
        }
    }

    const result = merged as unknown as ResumeData;
    if (!result.education?.length)      result.education      = base.education      ?? [];
    if (!result.customSections?.length) result.customSections = base.customSections ?? [];
    if (!result.certifications?.length) result.certifications = base.certifications ?? [];
    if (!result.experiences?.length)    result.experiences    = base.experiences    ?? [];
    if (!result.projects?.length)       result.projects       = base.projects       ?? [];
    return result;
}

/* ─── AI call ────────────────────────────────────────────── */

async function callSectionEdit(
    resume: ResumeData,
    section: ResumeSection,
    request: string,
    history: { role: string; content: string }[],
    settings: AISettings
): Promise<{ explanation: string; changes: string[]; patch: Partial<ResumeData> }> {
    const sectionData = extractSection(resume, section);
    const ctx = history.slice(-6).map(m =>
        `${m.role === 'user' ? 'User' : 'Agent'}: ${m.content}`
    ).join('\n');

    const returnFormats: Record<ResumeSection, string> = {
        summary:        '{ "summary": "full updated summary string" }',
        experience:     '{ "experiences": [ /* ALL job entries with updated bullets */ ] }',
        skills:         '{ "skills": { "languages": "...", "frameworks": "...", /* all categories */ } }',
        projects:       '{ "projects": [ /* ALL projects */ ] }',
        certifications: '{ "certifications": [ /* ALL certs */ ] }',
        education:      '{ "education": [ /* ALL education entries */ ] }',
        title:          '{ "fullName": "...", "title": "..." }',
        full:           '{ /* complete ResumeData */ }',
    };

    const sectionRules: Record<ResumeSection, string> = {
        experience:     'Keep ALL job entries. Only improve bullet points. Use metrics only when they are already supported by the resume or explicitly provided by the user.',
        skills:         'Keep ALL skill categories. Only update/enhance the skill values.',
        projects:       'Keep ALL projects. Only improve descriptions.',
        certifications: 'Keep ALL existing certifications exactly as-is unless explicitly asked to change.',
        education:      'Keep ALL education entries exactly as-is unless explicitly asked to change.',
        summary:        'Rewrite/improve the summary text based on the request.',
        title:          'Only update fullName or title fields.',
        full:           'Improve the resume holistically based on the request.',
    };

    const prompt = `You are a professional resume editor with expert-level English writing skills.
Edit ONLY the "${SECTION_LABELS[section]}" section of this resume.

CURRENT SECTION DATA:
${JSON.stringify(sectionData)}

${ctx ? `CONVERSATION HISTORY:\n${ctx}\n` : ''}USER REQUEST: "${request}"

CRITICAL RULES - read carefully:
1. ${sectionRules[section]}
2. ⚠️ The user's message may contain typos/spelling mistakes. DO NOT copy the user's typos into the resume. The resume must have perfect grammar and spelling.
3. Understand the user's INTENT even if their phrasing is messy. E.g. "make teh summery one liner" means "condense the summary to one sentence".
4. Only edit what was asked. Do not add, remove, or reformat anything that wasn't requested.
5. Output professional, polished English in the resume content.
6. Never invent new experience, tools, dates, metrics, or achievements while making the edit.

Return ONLY this JSON (no markdown, no backticks, no extra text):
{
  "explanation": "One clear sentence describing exactly what was changed",
  "changes": ["Specific change 1", "Specific change 2"],
  "patch": ${returnFormats[section]}
}`;

    const raw = await callAI(prompt, settings);
    let parsed: { explanation?: string; changes?: string[]; patch?: Partial<ResumeData> };
    try {
        parsed = JSON.parse(extractJSON(raw.trim()));
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

/* ─── Drag hook ──────────────────────────────────────────── */

function useDrag(panelRef: React.RefObject<HTMLDivElement | null>) {
    const posRef   = useRef({ x: 0, y: 0 });
    const startRef = useRef({ mx: 0, my: 0, px: 0, py: 0 });
    const initialized = useRef(false);

    useEffect(() => {
        const el = panelRef.current;
        if (!el || initialized.current) return;
        initialized.current = true;
        const rect = el.getBoundingClientRect();
        posRef.current = { x: rect.left, y: rect.top };
        el.style.left   = `${rect.left}px`;
        el.style.top    = `${rect.top}px`;
        el.style.right  = 'auto';
        el.style.bottom = 'auto';
    }, [panelRef]);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button, textarea, input')) return;
        e.preventDefault();
        startRef.current = {
            mx: e.clientX,
            my: e.clientY,
            px: posRef.current.x,
            py: posRef.current.y,
        };

        const onMove = (ev: MouseEvent) => {
            const el = panelRef.current;
            if (!el) return;
            const dx = ev.clientX - startRef.current.mx;
            const dy = ev.clientY - startRef.current.my;
            const W  = window.innerWidth;
            const H  = window.innerHeight;
            const nx = Math.max(8, Math.min(W - el.offsetWidth  - 8, startRef.current.px + dx));
            const ny = Math.max(8, Math.min(H - el.offsetHeight - 8, startRef.current.py + dy));
            posRef.current = { x: nx, y: ny };
            el.style.left = `${nx}px`;
            el.style.top  = `${ny}px`;
        };

        const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup',   onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    }, [panelRef]);

    return { onMouseDown };
}

/* ─── Section picker button ──────────────────────────────── */

const ALL_SECTIONS: ResumeSection[] = [
    'summary', 'experience', 'skills', 'projects',
    'certifications', 'education', 'title',
];

const HISTORY_LIMIT = 6;

/* ─── Helpers ────────────────────────────────────────────── */

const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ─── Component ──────────────────────────────────────────── */

export function AIAgentPanel({ resume, settings, onApply, onClose }: AIAgentPanelProps) {
    const [messages,    setMessages]    = useState<AgentMessage[]>([{
        id: 'welcome', role: 'agent',
        content: "Tell me what to change and I'll detect the section automatically. Or pick a section below to target it directly.",
        timestamp: Date.now(),
    }]);
    const [input,       setInput]       = useState('');
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState('');
    const [minimized,   setMinimized]   = useState(false);
    // Track the last section the agent edited (for follow-up messages)
    const lastSection = useRef<ResumeSection | undefined>(undefined);

    const panelRef   = useRef<HTMLDivElement>(null);
    const bottomRef  = useRef<HTMLDivElement>(null);
    const inputRef   = useRef<HTMLTextAreaElement>(null);
    const liveResume = useRef<ResumeData>(resume);
    useEffect(() => { liveResume.current = resume; }, [resume]);

    const { onMouseDown } = useDrag(panelRef);

    useEffect(() => {
        if (!minimized) {
            setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
        }
    }, [messages, minimized]);

    const recentHistory = useMemo(() =>
        messages
            .filter(m => m.id !== 'welcome')
            .slice(-HISTORY_LIMIT)
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    , [messages]);

    /* Send */
    const send = async (text?: string, forceSection?: ResumeSection) => {
        const userText = (text ?? input).trim();
        if (!userText || loading) return;

        // Detect section — pass lastSection for follow-up context
        const section = forceSection ?? detectSection(userText, lastSection.current);

        setMessages(prev => [...prev, {
            id: generateId(), role: 'user', content: userText,
            detectedSection: section, timestamp: Date.now(),
        }]);
        setInput('');
        setLoading(true);
        setError('');
        if (minimized) setMinimized(false);

        try {
            const result = await callSectionEdit(
                liveResume.current, section, userText, recentHistory, settings
            );
            lastSection.current = section;
            setMessages(prev => [...prev, {
                id: generateId(), role: 'agent', content: result.explanation,
                edit: { section, label: SECTION_LABELS[section], patch: result.patch, changes: result.changes, status: 'pending' },
                timestamp: Date.now(),
            }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
        } finally {
            setLoading(false);
        }
    };

    /* Approve — all inside single setState to prevent race */
    const approve = useCallback((msgId: string) => {
        setMessages(prev => {
            const msg = prev.find(m => m.id === msgId);
            if (!msg?.edit || msg.edit.status !== 'pending') return prev;
            const newResume = applyPatch(liveResume.current, msg.edit.patch);
            onApply(newResume, `[${msg.edit.label}] ${msg.edit.changes.join('; ')}`);
            return [
                ...prev.map(m => m.id === msgId
                    ? { ...m, edit: { ...m.edit!, status: 'approved' as ProposalStatus } }
                    : m
                ),
                { id: generateId(), role: 'agent' as const, content: '✓ Applied. Revert anytime via Edit History.', timestamp: Date.now() },
            ];
        });
    }, [onApply]);

    /* Reject */
    const reject = useCallback((msgId: string) => {
        setMessages(prev => [
            ...prev.map(m => m.id === msgId && m.edit
                ? { ...m, edit: { ...m.edit, status: 'rejected' as ProposalStatus } }
                : m
            ),
            { id: generateId(), role: 'agent' as const, content: "Discarded. What would you like differently?", timestamp: Date.now() },
        ]);
    }, []);

    const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
    };

    /* FAB */
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

    return (
        <div className="agent-float" ref={panelRef}>

            {/* Header - drag handle */}
            <div className="agf-header agf-drag-handle" onMouseDown={onMouseDown}>
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
                <div className="agf-drag-hint">⠿</div>
                <div className="agf-hbtns">
                    <button className="agf-hbtn" onClick={() => setMinimized(true)} title="Minimise">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                    <button className="agf-hbtn" onClick={onClose} title="Close">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6"  y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Section quick-pick bar */}
            <div className="agf-section-bar">
                {ALL_SECTIONS.map(s => (
                    <button
                        key={s}
                        className={`agf-sec-btn ${lastSection.current === s ? 'active' : ''}`}
                        onClick={() => inputRef.current?.focus()}
                        onMouseDown={() => { lastSection.current = s; }}
                        title={`Target: ${SECTION_LABELS[s]}`}
                        disabled={loading}
                    >
                        <span>{SECTION_ICONS[s]}</span>
                        <span>{SECTION_LABELS[s]}</span>
                    </button>
                ))}
            </div>

            {/* Messages */}
            <div className="agf-msgs">
                {messages.map(msg => (
                    <div key={msg.id} className={`agf-msg agf-msg-${msg.role}`}>
                        {msg.role === 'agent' && <div className="agf-avatar-sm">✦</div>}
                        <div className="agf-msg-body">
                            <div className={`agf-bubble agf-bubble-${msg.role}`}>{msg.content}</div>

                            {/* Section pill on user messages */}
                            {msg.role === 'user' && msg.detectedSection && (
                                <div className="agf-section-pill">
                                    {SECTION_ICONS[msg.detectedSection]}
                                    <span>{SECTION_LABELS[msg.detectedSection]}</span>
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
                                                <line x1="6"  y1="6" x2="18" y2="18" />
                                            </svg>
                                            Discard
                                        </button>
                                    </div>
                                </div>
                            )}

                            {msg.edit?.status === 'approved' && <div className="agf-pstatus ok">✓ applied</div>}
                            {msg.edit?.status === 'rejected' && <div className="agf-pstatus no">✕ discarded</div>}

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
                            <line x1="12" y1="8"  x2="12"    y2="13" />
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
                    placeholder="Describe the change… (Enter to send, Shift+Enter for newline)"
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
