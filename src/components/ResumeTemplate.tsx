import { memo } from 'react';
import type { ResumeData } from '../types';
import { formatSkillCategory } from '../types';
import { EditableResumeBlock, type ResumeCanvasEditingProps } from './ResumeCanvasEditor';

interface ResumeTemplateProps {
    data: ResumeData;
    editing?: ResumeCanvasEditingProps;
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

export const ResumeTemplate = memo(function ResumeTemplate({ data, editing }: ResumeTemplateProps) {
    return (
        <div className="resume-container">
            <EditableResumeBlock data={data} editing={editing} block={{ type: 'header' }} label="Header" className="header">
                <h1>{data.fullName?.toUpperCase() || 'YOUR NAME'}</h1>
                <div className="title">{data.title || 'Your Title'}</div>
                <div className="contact-info">
                    {data.email && <span>{data.email}</span>}
                    {data.phone && <span>{data.phone}</span>}
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
                    {data.location && <span>{data.location}</span>}
                </div>
            </EditableResumeBlock>

            <div className="content">
                {data.summary && (
                    <EditableResumeBlock data={data} editing={editing} block={{ type: 'summary' }} label="Summary" className="section">
                        <h2 className="section-title">Professional Summary</h2>
                        <p className="summary">
                            <Linkify text={data.summary} />
                        </p>
                    </EditableResumeBlock>
                )}

                {data.experiences && data.experiences.length > 0 && (
                    <div className="section">
                        <h2 className="section-title">Professional Experience</h2>
                        {data.experiences.map((exp, expIdx) => (
                            <EditableResumeBlock
                                key={`${exp.jobTitle}-${exp.company}-${exp.duration}`}
                                data={data}
                                editing={editing}
                                block={{ type: 'experience', index: expIdx }}
                                label={exp.jobTitle || `Experience ${expIdx + 1}`}
                                className="experience-item"
                            >
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
                            </EditableResumeBlock>
                        ))}
                    </div>
                )}

                {data.education && data.education.length > 0 && (
                    <div className="section">
                        <h2 className="section-title">Education</h2>
                        {data.education.map((edu, eduIdx) => (
                            <EditableResumeBlock
                                key={`${edu.degree}-${edu.institution}-${edu.year}`}
                                data={data}
                                editing={editing}
                                block={{ type: 'education', index: eduIdx }}
                                label={edu.degree || `Education ${eduIdx + 1}`}
                                className="education-item"
                            >
                                <div className="education-header">
                                    <div>
                                        <div className="degree">{edu.degree}</div>
                                        <div className="institution">{edu.institution}</div>
                                    </div>
                                    <div className="year">{edu.year}</div>
                                </div>
                                {edu.details && <div className="education-details"><Linkify text={edu.details} /></div>}
                            </EditableResumeBlock>
                        ))}
                    </div>
                )}

                {data.skills && Object.keys(data.skills).length > 0 && (
                    <EditableResumeBlock data={data} editing={editing} block={{ type: 'skills' }} label="Skills" className="section">
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
                    </EditableResumeBlock>
                )}

                {data.projects && data.projects.length > 0 && (
                    <div className="section">
                        <h2 className="section-title">Key Projects</h2>
                        {data.projects.map((project, projectIdx) => (
                            <EditableResumeBlock
                                key={`${project.title}-${project.description.slice(0, 30)}`}
                                data={data}
                                editing={editing}
                                block={{ type: 'project', index: projectIdx }}
                                label={project.title || `Project ${projectIdx + 1}`}
                                className="project-item"
                            >
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
                            </EditableResumeBlock>
                        ))}
                    </div>
                )}

                {data.certifications && data.certifications.length > 0 && (
                    <EditableResumeBlock data={data} editing={editing} block={{ type: 'certifications' }} label="Certifications" className="section">
                        <h2 className="section-title">Certifications</h2>
                        <div className="certifications-list">
                            {data.certifications.map((cert) => {
                                const pipeIdx = cert.indexOf('|');
                                const certName = pipeIdx > -1 ? cert.slice(0, pipeIdx).trim() : cert.trim();
                                const certMeta = pipeIdx > -1 ? cert.slice(pipeIdx + 1).trim() : '';
                                return (
                                    <div key={cert.slice(0, 50)} className="cert-item">
                                        <span className="cert-name">{certName}</span>
                                        {certMeta && <span className="cert-meta">{certMeta}</span>}
                                    </div>
                                );
                            })}
                        </div>
                    </EditableResumeBlock>
                )}

                {data.customSections && data.customSections.length > 0 && (
                    data.customSections
                        .map((section, sectionIdx) => (
                            section.title.toLowerCase().includes('certific') ? null : (
                            <EditableResumeBlock
                                key={section.title}
                                data={data}
                                editing={editing}
                                block={{ type: 'custom', index: sectionIdx }}
                                label={section.title}
                                className="section"
                            >
                                <h2 className="section-title">{section.title}</h2>
                                <div className="custom-section-list">
                                    {(Array.isArray(section.items)
                                        ? section.items
                                        : typeof section.items === 'string'
                                            ? [section.items]
                                            : []
                                    ).map((item) => (
                                        <div key={item.slice(0, 50)} className="custom-item">
                                            - <Linkify text={item} />
                                        </div>
                                    ))}
                                </div>
                            </EditableResumeBlock>
                            )
                        ))
                )}
            </div>
        </div>
    );
});
