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

/* ─── Section detection ──────────────────────────────────── */

const SECTION_PATTERNS: [ResumeSection, RegExp][] = [
    ['title',          /title|headline|designation|job\s*title|full\s*name/i],
    ['summary',        /summar|summ?ery|about\s*me|objective|profile|overview|intro|bio/i],
    ['experience',     /experience|exp\b|work|job|role|position|bullet|dut(y|ies)|achievement|employer|career/i],
    ['skills',         /skill|technolog|tech\s*stack|tool|language|framework|competen|proficien/i],
    ['projects',       /project|portfolio|side\s*project|\bapp\b|built|developed|github|demo/i],
    ['certifications', /certif|licen[sc]e|credential|course|aws\b|google\s*cert/i],
    ['education',      /educat|degree|university|college|school|gpa|graduat|studi/i],
    ['full',           /everything|whole\s*resume|entire|full\s*resume|complete/i],
];

function detectSection(msg: string): ResumeSection {
    for (const [section, pattern] of SECTION_PATTERNS) {
        if (pattern.test(msg)) return section;
    }
    if (/punch|concis|shorter|longer|one.?lin|rewrite|better|improve|crip/i.test(msg)) return 'summary';
    return 'summary';
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

Apply exactly what was asked. Keep it professional.
${section === 'experience' ? 'Keep ALL job entries. Only improve the bullet points.' : ''}
${section === 'skills' ? 'Keep ALL skill categories. Only update the values.' : ''}

Return ONLY this JSON (no markdown, no extra text):
{
  "explanation": "One clear sentence describing what changed",
  "changes": ["Specific change description"],
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
    const dragging = useRef(false);

    // Set initial position once
    useEffect(() => {
        const el = panelRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        posRef.current = { x: rect.left, y: rect.top };
        el.style.left   = `${rect.left}px`;
        el.style.top    = `${rect.top}px`;
        el.style.right  = 'auto';
        el.style.bottom = 'auto';
    }, [panelRef]);

    const onMouseDown = useCallback((e: React.MouseEvent) => {
        // Only drag from header (not buttons)
        if ((e.target as HTMLElement).closest('button')) return;
        dragging.current = true;
        startRef.current = {
            mx: e.clientX,
            my: e.clientY,
            px: posRef.current.x,
            py: posRef.current.y,
        };
        e.preventDefault();

        const onMove = (ev: MouseEvent) => {
            if (!dragging.current || !panelRef.current) return;
            const dx = ev.clientX - startRef.current.mx;
            const dy = ev.clientY - startRef.current.my;
            const el = panelRef.current;
            const W = window.innerWidth;
            const H = window.innerHeight;
            const w = el.offsetWidth;
            const h = el.offsetHeight;
            const nx = Math.max(8, Math.min(W - w - 8, startRef.current.px + dx));
            const ny = Math.max(8, Math.min(H - h - 8, startRef.current.py + dy));
            posRef.current = { x: nx, y: ny };
            el.style.left = `${nx}px`;
            el.style.top  = `${ny}px`;
        };

        const onUp = () => {
            dragging.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };

        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup',   onUp);
    }, [panelRef]);

    return { onMouseDown };
}

/* ─── Helpers ────────────────────────────────────────────── */

const fmtTime = (ts: number) =>
    new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

/* ─── Component ──────────────────────────────────────────── */

export function AIAgentPanel({ resume, settings, onApply, onClose }: AIAgentPanelProps) {
    const [messages, setMessages] = useState<AgentMessage[]>([{
        id: 'welcome',
        role: 'agent',
        content: "I auto-detect which section to edit. Changes are previewed before applying — you stay in control.",
        timestamp: Date.now(),
    }]);
    const [input,     setInput]     = useState('');
    const [loading,   setLoading]   = useState(false);
    const [error,     setError]     = useState('');
    const [minimized, setMinimized] = useState(false);

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

    const getHistory = useCallback(() =>
        messages
            .filter(m => m.id !== 'welcome')
            .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }))
    , [messages]);

    /* Send */
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
                liveResume.current, section, userText, getHistory(), settings
            );
            setMessages(prev => [...prev, {
                id: generateId(),
                role: 'agent',
                content: result.explanation,
                edit: { section, label: SECTION_LABELS[section], patch: result.patch, changes: result.changes, status: 'pending' },
                timestamp: Date.now(),
            }]);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
        } finally {
            setLoading(false);
        }
    };

    /* Approve — fully inside single setState to avoid race */
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

            {/* Header — drag handle */}
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
                            <div className={`agf-bubble agf-bubble-${msg.role}`}>{msg.content}</div>

                            {msg.role === 'user' && msg.id !== 'welcome' && (
                                <div className="agf-section-pill">
                                    {SECTION_ICONS[detectSection(msg.content)]}
                                    <span>{SECTION_LABELS[detectSection(msg.content)]}</span>
                                </div>
                            )}

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
