import { memo } from 'react';
import type { ResumeData } from '../types';
import { formatSkillCategory } from '../types';

interface ResumeTemplateModernProps {
    data: ResumeData;
    atsKeywords?: string[];
}

// Helper to validate URLs
function isValidUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
}

// Helper to auto-linkify text
const Linkify = memo(function Linkify({ text }: { text: string }) {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);
    return (
        <>
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer">
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </>
    );
});

// Helper to extract display domain from URL
function displayUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '') + (parsed.pathname !== '/' ? parsed.pathname : '');
    } catch {
        return url;
    }
}

export const ResumeTemplateModern = memo(function ResumeTemplateModern({ data, atsKeywords }: ResumeTemplateModernProps) {
    return (
        <div className="resume-modern">
            {/* HEADER */}
            <div className="rm-head">
                <div className="rm-head-name">{data.fullName || 'Your Name'}</div>
                <div className="rm-head-title">{data.title || 'Your Title'}</div>
                <div className="rm-head-contact">
                    {data.email && <span>{data.email}</span>}
                    {data.email && data.phone && <span className="rm-sep">·</span>}
                    {data.phone && <span>{data.phone}</span>}
                    {data.location && <><span className="rm-sep">·</span><span>{data.location}</span></>}
                    {isValidUrl(data.portfolio) && (
                        <><span className="rm-sep">·</span><a href={data.portfolio} target="_blank" rel="noopener noreferrer">{displayUrl(data.portfolio)}</a></>
                    )}
                    {isValidUrl(data.linkedin) && (
                        <><span className="rm-sep">·</span><a href={data.linkedin} target="_blank" rel="noopener noreferrer">{displayUrl(data.linkedin)}</a></>
                    )}
                    {isValidUrl(data.github) && (
                        <><span className="rm-sep">·</span><a href={data.github} target="_blank" rel="noopener noreferrer">{displayUrl(data.github)}</a></>
                    )}
                </div>
            </div>

            {/* SUMMARY */}
            {data.summary && (
                <section className="rm-section">
                    <div className="rm-sec-label">Summary</div>
                    <p className="rm-summary"><Linkify text={data.summary} /></p>
                </section>
            )}

            {/* EXPERIENCE */}
            {data.experiences && data.experiences.length > 0 && (
                <section className="rm-section">
                    <div className="rm-sec-label">Experience</div>
                    {data.experiences.map((exp) => (
                        <div key={`${exp.jobTitle}-${exp.company}-${exp.duration}`} className="rm-entry">
                            <div className="rm-entry-top">
                                <div className="rm-entry-title">{exp.jobTitle}</div>
                                <div className="rm-entry-period">{exp.duration}</div>
                            </div>
                            <div className="rm-entry-org">{exp.company}</div>
                            {exp.duties && exp.duties.length > 0 && (
                                <ul className="rm-bullets">
                                    {exp.duties.map((duty) => (
                                        <li key={duty.slice(0, 50)}><Linkify text={duty} /></li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    ))}
                </section>
            )}

            {/* EDUCATION */}
            {data.education && data.education.length > 0 && (
                <section className="rm-section">
                    <div className="rm-sec-label">Education</div>
                    {data.education.map((edu) => (
                        <div key={`${edu.degree}-${edu.institution}-${edu.year}`} className="rm-entry">
                            <div className="rm-entry-top">
                                <div className="rm-entry-title">{edu.degree}</div>
                                <div className="rm-entry-period">{edu.year}</div>
                            </div>
                            <div className="rm-entry-org">{edu.institution}</div>
                            {edu.details && <div className="rm-entry-sub">{edu.details}</div>}
                        </div>
                    ))}
                </section>
            )}

            {/* SKILLS */}
            {data.skills && Object.keys(data.skills).length > 0 && (
                <section className="rm-section">
                    <div className="rm-sec-label">Skills</div>
                    <table className="rm-skills-table" role="presentation">
                        <tbody>
                            {Object.entries(data.skills).map(([category, skills]) =>
                                skills && (
                                    <tr key={category}>
                                        <td className="rm-sk">{formatSkillCategory(category)}</td>
                                        <td className="rm-sv">{skills}</td>
                                    </tr>
                                )
                            )}
                        </tbody>
                    </table>
                </section>
            )}

            {/* PROJECTS */}
            {data.projects && data.projects.length > 0 && (
                <section className="rm-section">
                    <div className="rm-sec-label">Projects</div>
                    {data.projects.map((project) => (
                        <div key={`${project.title}-${project.description.slice(0, 30)}`} className="rm-project">
                            <div className="rm-proj-top">
                                <span className="rm-proj-name">{project.title}</span>
                            </div>
                            <p className="rm-proj-desc"><Linkify text={project.description} /></p>
                            {project.url && (
                                <a
                                    className="rm-proj-link"
                                    href={project.url.startsWith('http') ? project.url : `https://${project.url}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {displayUrl(project.url.startsWith('http') ? project.url : `https://${project.url}`)}
                                </a>
                            )}
                        </div>
                    ))}
                </section>
            )}

            {/* CERTIFICATIONS */}
            {data.certifications && data.certifications.length > 0 && (
                <section className="rm-section">
                    <div className="rm-sec-label">Certifications</div>
                    <div className="rm-cert-list">
                        {data.certifications.map((cert) => {
                            const pipeIdx = cert.indexOf('|');
                            const certName = pipeIdx > -1 ? cert.slice(0, pipeIdx).trim() : cert.trim();
                            const certMeta = pipeIdx > -1 ? cert.slice(pipeIdx + 1).trim() : '';
                            return (
                                <div key={cert.slice(0, 50)} className="rm-cert-item">
                                    <span className="rm-cert-name">{certName}</span>
                                    {certMeta && <span className="rm-cert-meta">{certMeta}</span>}
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* CUSTOM SECTIONS */}
            {data.customSections && data.customSections.length > 0 && (
                data.customSections
                    .filter(section => !section.title.toLowerCase().includes('certific'))
                    .map((section) => (
                        <section key={section.title} className="rm-section">
                            <div className="rm-sec-label">{section.title}</div>
                            <ul className="rm-bullets">
                                {(Array.isArray(section.items)
                                    ? section.items
                                    : typeof section.items === 'string'
                                        ? [section.items]
                                        : []
                                ).map((item) => (
                                    <li key={item.slice(0, 50)}><Linkify text={item} /></li>
                                ))}
                            </ul>
                        </section>
                    ))
            )}

            {/* ATS Hidden Keywords */}
            {atsKeywords && atsKeywords.length > 0 && (
                <div className="ats-keywords" aria-hidden="true">
                    {atsKeywords.join(' | ')}
                </div>
            )}
        </div>
    );
});
