import { memo } from 'react';
import type { ResumeData } from '../types';
import { formatSkillCategory } from '../types';

interface ResumeTemplateProps {
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

// Helper to auto-linkify text - moved outside component to prevent recreation
const Linkify = memo(function Linkify({ text }: { text: string }) {
    if (!text) return null;

    // Regex for URLs
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
                            style={{ color: '#2563eb', textDecoration: 'underline' }}
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

// Memoized ResumeTemplate component for better performance
export const ResumeTemplate = memo(function ResumeTemplate({ data, atsKeywords }: ResumeTemplateProps) {
    return (
        <div className="resume-container">
            <div className="header">
                <h1>{data.fullName?.toUpperCase() || 'YOUR NAME'}</h1>
                <div className="title">{data.title || 'Your Title'}</div>
                <div className="contact-info">
                    {data.email && <span>📧 {data.email}</span>}
                    {data.phone && <span>📱 {data.phone}</span>}
                    {isValidUrl(data.linkedin) && (
                        <span>
                            <a href={data.linkedin} target="_blank" rel="noopener noreferrer">
                                LinkedIn
                            </a>
                        </span>
                    )}
                    {isValidUrl(data.github) && (
                        <span>
                            <a href={data.github} target="_blank" rel="noopener noreferrer">
                                GitHub
                            </a>
                        </span>
                    )}
                    {isValidUrl(data.portfolio) && (
                        <span>
                            <a href={data.portfolio} target="_blank" rel="noopener noreferrer">
                                Portfolio
                            </a>
                        </span>
                    )}
                    {data.location && <span>📍 {data.location}</span>}
                </div>
            </div>

            <div className="content">
                {data.summary && (
                    <div className="section">
                        <h2 className="section-title">Professional Summary</h2>
                        <p className="summary">
                            <Linkify text={data.summary} />
                        </p>
                    </div>
                )}

                {data.experiences && data.experiences.length > 0 && (
                    <div className="section">
                        <h2 className="section-title">Professional Experience</h2>
                        {data.experiences.map((exp) => (
                            <div key={`${exp.jobTitle}-${exp.company}-${exp.duration}`} className="experience-item">
                                <div className="experience-header">
                                    <div>
                                        <div className="job-title">{exp.jobTitle}</div>
                                        <div className="company">{exp.company}</div>
                                    </div>
                                    <div className="duration">{exp.duration}</div>
                                </div>
                                {exp.duties && exp.duties.length > 0 && (
                                    <ul className="duties">
                                        {exp.duties.map((duty) => (
                                            <li key={duty.slice(0, 50)}><Linkify text={duty} /></li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Education Section */}
                {data.education && data.education.length > 0 && (
                    <div className="section">
                        <h2 className="section-title">Education</h2>
                        {data.education.map((edu) => (
                            <div key={`${edu.degree}-${edu.institution}-${edu.year}`} className="education-item">
                                <div className="education-header">
                                    <div>
                                        <div className="degree">{edu.degree}</div>
                                        <div className="institution">{edu.institution}</div>
                                    </div>
                                    <div className="year">{edu.year}</div>
                                </div>
                                {edu.details && <div className="education-details"><Linkify text={edu.details} /></div>}
                            </div>
                        ))}
                    </div>
                )}

                {data.skills && Object.keys(data.skills).length > 0 && (
                    <div className="section">
                        <h2 className="section-title">Skills</h2>
                        <div className="skills-grid">
                            {Object.entries(data.skills).map(([category, skills]) =>
                                skills && (
                                    <div key={category} className="skill-category">
                                        <strong>{formatSkillCategory(category)}:</strong> {skills}
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                )}

                {data.projects && data.projects.length > 0 && (
                    <div className="section">
                        <h2 className="section-title">Key Projects</h2>
                        {data.projects.map((project) => (
                            <div key={`${project.title}-${project.description.slice(0, 30)}`} className="project-item">
                                <span className="project-title">
                                    {project.url ? (
                                        <a href={project.url.startsWith('http') ? project.url : `https://${project.url}`} target="_blank" rel="noopener noreferrer">
                                            {project.title}
                                        </a>
                                    ) : (
                                        project.title
                                    )}
                                </span>
                                <Linkify text={project.description} />
                            </div>
                        ))}
                    </div>
                )}

                {data.certifications && data.certifications.length > 0 && (
                    <div className="section">
                        <h2 className="section-title">Certifications</h2>
                        <div className="certifications-list">
                            {data.certifications.map((cert) => (
                                <div key={cert.slice(0, 50)} className="cert-item">
                                    • <Linkify text={cert} />
                                </div>
                            ))}
                        </div>
                    </div>
                )}



                {/* Dynamic Custom Sections */}
                {data.customSections && data.customSections.length > 0 && (
                    data.customSections
                        // Filter out certificate sections to avoid duplication with the dedicated certifications section
                        .filter(section => !section.title.toLowerCase().includes('certific'))
                        .map((section) => (
                            <div key={section.title} className="section">
                                <h2 className="section-title">{section.title}</h2>
                                <div className="custom-section-list">
                                    {/* Robust handling: check if items is array, if not wrap it, if string split it, etc. */}
                                    {(Array.isArray(section.items)
                                        ? section.items
                                        : typeof section.items === 'string'
                                            ? [section.items]
                                            : []
                                    ).map((item) => (
                                        <div key={item.slice(0, 50)} className="custom-item">
                                            • <Linkify text={item} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                )}
            </div>

            {/* ATS Hidden Keywords - White-on-white text visible to ATS parsers in PDF */}
            {atsKeywords && atsKeywords.length > 0 && (
                <div className="ats-keywords" aria-hidden="true">
                    {atsKeywords.join(' | ')}
                </div>
            )}
        </div>
    );
});
