import { memo } from 'react';
import type { ResumeData } from '../types';
import { formatSkillCategory } from '../types';

interface CVTemplateExecutiveProps {
    data: ResumeData;
}

function isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

function displayUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '') + (parsed.pathname !== '/' ? parsed.pathname : '');
    } catch {
        return url;
    }
}

const Linkify = memo(function Linkify({ text }: { text: string }) {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return (
        <>
            {parts.map((part, i) =>
                part.match(urlRegex)
                    ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{displayUrl(part)}</a>
                    : part
            )}
        </>
    );
});

export const CVTemplateExecutive = memo(function CVTemplateExecutive({ data }: CVTemplateExecutiveProps) {
    const contactItems = [
        data.email,
        data.phone,
        data.location,
        isValidUrl(data.linkedin) ? displayUrl(data.linkedin) : '',
        isValidUrl(data.github) ? displayUrl(data.github) : '',
        isValidUrl(data.portfolio) ? displayUrl(data.portfolio) : '',
    ].filter(Boolean);

    return (
        <div className="re2-root">
            <header className="re2-header">
                <div className="re2-name-block">
                    <h1 className="re2-name">{data.fullName || 'Candidate Name'}</h1>
                    <div className="re2-role">{data.title || 'Professional Title'}</div>
                </div>
                <div className="re2-contact-block">
                    {contactItems.map((item, i) => (
                        <span key={i} className="re2-contact-item">{item}</span>
                    ))}
                </div>
            </header>

            <div className="re2-rule-top" />

            <div className="re2-body">
                {data.summary && (
                    <section className="re2-section">
                        <div className="re2-section-label">Professional Profile</div>
                        <div className="re2-section-content">
                            <p className="re2-summary"><Linkify text={data.summary} /></p>
                        </div>
                    </section>
                )}

                {data.experiences?.length > 0 && (
                    <section className="re2-section">
                        <div className="re2-section-label">Professional Experience</div>
                        <div className="re2-section-content">
                            {data.experiences.map((exp, i) => (
                                <div key={i} className="re2-entry">
                                    <div className="re2-entry-head">
                                        <div className="re2-entry-left">
                                            <div className="re2-entry-title">{exp.jobTitle}</div>
                                            <div className="re2-entry-sub">{exp.company}</div>
                                        </div>
                                        <div className="re2-entry-date">{exp.duration}</div>
                                    </div>
                                    {exp.duties?.length > 0 && (
                                        <ul className="re2-bullets">
                                            {exp.duties.map((d, j) => (
                                                <li key={j}><Linkify text={d} /></li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {data.projects?.length > 0 && (
                    <section className="re2-section">
                        <div className="re2-section-label">Selected Projects</div>
                        <div className="re2-section-content">
                            {data.projects.map((p, i) => (
                                <div key={i} className="re2-entry">
                                    <div className="re2-entry-head">
                                        <div className="re2-entry-title">
                                            {p.url
                                                ? <a href={p.url.startsWith('http') ? p.url : `https://${p.url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: '2px' }}>{p.title}</a>
                                                : p.title}
                                        </div>
                                    </div>
                                    <p className="re2-proj-desc"><Linkify text={p.description} /></p>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {data.skills && Object.keys(data.skills).length > 0 && (
                    <section className="re2-section">
                        <div className="re2-section-label">Core Competencies</div>
                        <div className="re2-section-content">
                            <div className="re2-skills-grid">
                                {Object.entries(data.skills).map(([cat, val]) =>
                                    val ? (
                                        <div key={cat} className="re2-skill-row">
                                            <span className="re2-skill-cat">{formatSkillCategory(cat)}</span>
                                            <span className="re2-skill-val">{val}</span>
                                        </div>
                                    ) : null
                                )}
                            </div>
                        </div>
                    </section>
                )}

                {(data.education?.length ?? 0) > 0 && (
                    <section className="re2-section">
                        <div className="re2-section-label">Education</div>
                        <div className="re2-section-content">
                            {data.education?.map((edu, i) => (
                                <div key={i} className="re2-entry">
                                    <div className="re2-entry-head">
                                        <div className="re2-entry-left">
                                            <div className="re2-entry-title">{edu.degree}</div>
                                            <div className="re2-entry-sub">{edu.institution}</div>
                                        </div>
                                        <div className="re2-entry-date">{edu.year}</div>
                                    </div>
                                    {edu.details && <p className="re2-proj-desc">{edu.details}</p>}
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {data.certifications?.length > 0 && (
                    <section className="re2-section">
                        <div className="re2-section-label">Certifications</div>
                        <div className="re2-section-content">
                            <div className="re2-cert-list">
                                {data.certifications.map((cert, i) => {
                                    const pipeIdx = cert.indexOf('|');
                                    const name = pipeIdx > -1 ? cert.slice(0, pipeIdx).trim() : cert.trim();
                                    const meta = pipeIdx > -1 ? cert.slice(pipeIdx + 1).trim() : '';
                                    return (
                                        <div key={i} className="re2-cert-item">
                                            <span className="re2-cert-name">{name}</span>
                                            {meta && <span className="re2-cert-meta">{meta}</span>}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </section>
                )}

                {data.customSections?.filter(s => !s.title.toLowerCase().includes('certific')).map((s, i) => (
                    <section key={i} className="re2-section">
                        <div className="re2-section-label">{s.title}</div>
                        <div className="re2-section-content">
                            <ul className="re2-bullets">
                                {s.items.map((item, j) => <li key={j}><Linkify text={item} /></li>)}
                            </ul>
                        </div>
                    </section>
                ))}
            </div>

            <div className="re2-rule-bottom" />
        </div>
    );
});
