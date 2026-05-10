import { memo } from 'react';
import type { ResumeData } from '../types';
import { formatSkillCategory } from '../types';

interface CVTemplateModernProps {
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
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return (
                        <a key={i} href={part} target="_blank" rel="noopener noreferrer">
                            {displayUrl(part)}
                        </a>
                    );
                }
                return part;
            })}
        </>
    );
});

export const CVTemplateModern = memo(function CVTemplateModern({ data }: CVTemplateModernProps) {
    return (
        <div className="cv-modern">
            <header className="cv-modern-head">
                <div className="cv-modern-name">{data.fullName || 'Candidate Name'}</div>
                <div className="cv-modern-title">{data.title || 'Professional Title'}</div>
                <div className="cv-modern-contact">
                    {data.email && <span>{data.email}</span>}
                    {data.phone && <span>{data.phone}</span>}
                    {data.location && <span>{data.location}</span>}
                    {isValidUrl(data.portfolio) && <a href={data.portfolio} target="_blank" rel="noopener noreferrer">{displayUrl(data.portfolio)}</a>}
                    {isValidUrl(data.linkedin) && <a href={data.linkedin} target="_blank" rel="noopener noreferrer">{displayUrl(data.linkedin)}</a>}
                </div>
            </header>

            <div className="cv-modern-divider" />

            {data.summary && (
                <section className="cv-modern-section">
                    <div className="cv-modern-label">Professional Profile</div>
                    <p className="cv-modern-profile"><Linkify text={data.summary} /></p>
                </section>
            )}

            {data.experiences?.length > 0 && (
                <section className="cv-modern-section">
                    <div className="cv-modern-label">Experience</div>
                    {data.experiences.map((exp) => (
                        <article key={`${exp.jobTitle}-${exp.company}-${exp.duration}`} className="cv-modern-entry">
                            <div className="cv-modern-top">
                                <div>
                                    <div className="cv-modern-entry-title">{exp.jobTitle}</div>
                                    <div className="cv-modern-entry-company">{exp.company}</div>
                                </div>
                                <div className="cv-modern-entry-duration">{exp.duration}</div>
                            </div>
                            <ul className="cv-modern-bullets">
                                {exp.duties.map((duty) => (
                                    <li key={duty.slice(0, 50)}><Linkify text={duty} /></li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </section>
            )}

            {data.projects?.length > 0 && (
                <section className="cv-modern-section">
                    <div className="cv-modern-label">Selected Projects</div>
                    {data.projects.map((project) => (
                        <article key={`${project.title}-${project.description.slice(0, 30)}`} className="cv-modern-entry">
                            <div className="cv-modern-top">
                                <div className="cv-modern-entry-title">{project.title}</div>
                                {project.url && (
                                    <a
                                        className="cv-modern-link"
                                        href={project.url.startsWith('http') ? project.url : `https://${project.url}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {displayUrl(project.url.startsWith('http') ? project.url : `https://${project.url}`)}
                                    </a>
                                )}
                            </div>
                            <p className="cv-modern-project"><Linkify text={project.description} /></p>
                        </article>
                    ))}
                </section>
            )}

            {data.skills && Object.keys(data.skills).length > 0 && (
                <section className="cv-modern-section">
                    <div className="cv-modern-label">Core Competencies</div>
                    <div className="cv-modern-skills">
                        {Object.entries(data.skills).map(([category, skills]) => (
                            skills ? (
                                <div key={category} className="cv-modern-skill-row">
                                    <span className="cv-modern-skill-key">{formatSkillCategory(category)}</span>
                                    <span className="cv-modern-skill-value">{skills}</span>
                                </div>
                            ) : null
                        ))}
                    </div>
                </section>
            )}

            {(data.education?.length ?? 0) > 0 && (
                <section className="cv-modern-section">
                    <div className="cv-modern-label">Education</div>
                    {data.education?.map((edu) => (
                        <article key={`${edu.degree}-${edu.institution}-${edu.year}`} className="cv-modern-entry">
                            <div className="cv-modern-top">
                                <div>
                                    <div className="cv-modern-entry-title">{edu.degree}</div>
                                    <div className="cv-modern-entry-company">{edu.institution}</div>
                                </div>
                                <div className="cv-modern-entry-duration">{edu.year}</div>
                            </div>
                            {edu.details && <p className="cv-modern-project">{edu.details}</p>}
                        </article>
                    ))}
                </section>
            )}

            {data.certifications?.length > 0 && (
                <section className="cv-modern-section">
                    <div className="cv-modern-label">Certifications</div>
                    <div className="cv-modern-cert-list">
                        {data.certifications.map(cert => (
                            <div key={cert} className="cv-modern-cert-item">{cert}</div>
                        ))}
                    </div>
                </section>
            )}

            {data.customSections?.filter(section => !section.title.toLowerCase().includes('certific')).map(section => (
                <section key={section.title} className="cv-modern-section">
                    <div className="cv-modern-label">{section.title}</div>
                    <ul className="cv-modern-bullets">
                        {section.items.map(item => <li key={item}><Linkify text={item} /></li>)}
                    </ul>
                </section>
            ))}
        </div>
    );
});
