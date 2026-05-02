import { memo } from 'react';
import type { ResumeData } from '../types';
import { formatSkillCategory } from '../types';

interface CVTemplateProps {
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

const Linkify = memo(function Linkify({ text }: { text: string }) {
    if (!text) return null;

    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = text.split(urlRegex);

    return (
        <>
            {parts.map((part, i) => {
                if (part.match(urlRegex)) {
                    return (
                        <a
                            key={i}
                            href={part}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#1d4ed8', textDecoration: 'underline' }}
                        >
                            {part}
                        </a>
                    );
                }
                return part;
            })}
        </>
    );
});

export const CVTemplate = memo(function CVTemplate({ data }: CVTemplateProps) {
    return (
        <div className="cv-classic">
            <div className="cv-classic-header">
                <h1>{data.fullName || 'Candidate Name'}</h1>
                <div className="cv-classic-title">{data.title || 'Professional Title'}</div>
                <div className="cv-classic-contact">
                    {data.email && <span>{data.email}</span>}
                    {data.phone && <span>{data.phone}</span>}
                    {data.location && <span>{data.location}</span>}
                    {isValidUrl(data.linkedin) && <a href={data.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>}
                    {isValidUrl(data.github) && <a href={data.github} target="_blank" rel="noopener noreferrer">GitHub</a>}
                    {isValidUrl(data.portfolio) && <a href={data.portfolio} target="_blank" rel="noopener noreferrer">Portfolio</a>}
                </div>
            </div>

            {data.summary && (
                <section className="cv-section">
                    <h2>Professional Profile</h2>
                    <p><Linkify text={data.summary} /></p>
                </section>
            )}

            {data.experiences?.length > 0 && (
                <section className="cv-section">
                    <h2>Professional Experience</h2>
                    {data.experiences.map((exp) => (
                        <div key={`${exp.jobTitle}-${exp.company}-${exp.duration}`} className="cv-entry">
                            <div className="cv-entry-head">
                                <div>
                                    <div className="cv-entry-title">{exp.jobTitle}</div>
                                    <div className="cv-entry-company">{exp.company}</div>
                                </div>
                                <div className="cv-entry-duration">{exp.duration}</div>
                            </div>
                            <ul>
                                {exp.duties.map((duty) => (
                                    <li key={duty.slice(0, 50)}><Linkify text={duty} /></li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </section>
            )}

            {data.projects?.length > 0 && (
                <section className="cv-section">
                    <h2>Projects</h2>
                    {data.projects.map((project) => (
                        <div key={`${project.title}-${project.description.slice(0, 30)}`} className="cv-entry">
                            <div className="cv-entry-title">{project.title}</div>
                            <p><Linkify text={project.description} /></p>
                            {project.url && (
                                <a href={project.url.startsWith('http') ? project.url : `https://${project.url}`} target="_blank" rel="noopener noreferrer">
                                    {project.url}
                                </a>
                            )}
                        </div>
                    ))}
                </section>
            )}

            {data.skills && Object.keys(data.skills).length > 0 && (
                <section className="cv-section">
                    <h2>Core Competencies</h2>
                    <div className="cv-skill-grid">
                        {Object.entries(data.skills).map(([category, skills]) => (
                            skills ? <div key={category}><strong>{formatSkillCategory(category)}:</strong> {skills}</div> : null
                        ))}
                    </div>
                </section>
            )}

            {(data.education?.length ?? 0) > 0 && (
                <section className="cv-section">
                    <h2>Education</h2>
                    {data.education?.map((edu) => (
                        <div key={`${edu.degree}-${edu.institution}-${edu.year}`} className="cv-entry">
                            <div className="cv-entry-head">
                                <div>
                                    <div className="cv-entry-title">{edu.degree}</div>
                                    <div className="cv-entry-company">{edu.institution}</div>
                                </div>
                                <div className="cv-entry-duration">{edu.year}</div>
                            </div>
                            {edu.details && <p>{edu.details}</p>}
                        </div>
                    ))}
                </section>
            )}

            {data.certifications?.length > 0 && (
                <section className="cv-section">
                    <h2>Certifications</h2>
                    <ul>
                        {data.certifications.map(cert => <li key={cert}>{cert}</li>)}
                    </ul>
                </section>
            )}

            {data.customSections?.filter(section => !section.title.toLowerCase().includes('certific')).map(section => (
                <section key={section.title} className="cv-section">
                    <h2>{section.title}</h2>
                    <ul>
                        {section.items.map(item => <li key={item}><Linkify text={item} /></li>)}
                    </ul>
                </section>
            ))}
        </div>
    );
});
