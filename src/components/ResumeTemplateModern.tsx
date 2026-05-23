import { memo } from 'react';
import type { ResumeData } from '../types';
import { formatSkillCategory } from '../types';
import { EditableResumeBlock, type ResumeCanvasEditingProps } from './ResumeCanvasEditor';

interface ResumeTemplateModernProps {
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

function displayUrl(url: string): string {
    try {
        const parsed = new URL(url);
        return parsed.hostname.replace(/^www\./, '') + (parsed.pathname !== '/' ? parsed.pathname : '');
    } catch {
        return url;
    }
}

export const ResumeTemplateModern = memo(function ResumeTemplateModern({ data, editing }: ResumeTemplateModernProps) {
    return (
        <div className="resume-modern">
            <EditableResumeBlock data={data} editing={editing} block={{ type: 'header' }} label="Header" className="rm-head">
                <div className="rm-head-name">{data.fullName || 'Your Name'}</div>
                <div className="rm-head-title">{data.title || 'Your Title'}</div>
                <div className="rm-head-contact">
                    {data.email && <span>{data.email}</span>}
                    {data.email && data.phone && <span className="rm-sep">.</span>}
                    {data.phone && <span>{data.phone}</span>}
                    {data.location && <><span className="rm-sep">.</span><span>{data.location}</span></>}
                    {isValidUrl(data.portfolio) && (
                        <><span className="rm-sep">.</span><a href={data.portfolio} target="_blank" rel="noopener noreferrer">{displayUrl(data.portfolio)}</a></>
                    )}
                    {isValidUrl(data.linkedin) && (
                        <><span className="rm-sep">.</span><a href={data.linkedin} target="_blank" rel="noopener noreferrer">{displayUrl(data.linkedin)}</a></>
                    )}
                    {isValidUrl(data.github) && (
                        <><span className="rm-sep">.</span><a href={data.github} target="_blank" rel="noopener noreferrer">{displayUrl(data.github)}</a></>
                    )}
                </div>
            </EditableResumeBlock>

            {data.summary && (
                <EditableResumeBlock data={data} editing={editing} block={{ type: 'summary' }} label="Summary" className="rm-section">
                    <div className="rm-sec-label">Summary</div>
                    <p className="rm-summary"><Linkify text={data.summary} /></p>
                </EditableResumeBlock>
            )}

            {data.experiences && data.experiences.length > 0 && (
                <section className="rm-section">
                    <div className="rm-sec-label">Experience</div>
                    {data.experiences.map((exp, expIdx) => (
                        <EditableResumeBlock
                            key={`${exp.jobTitle}-${exp.company}-${exp.duration}`}
                            data={data}
                            editing={editing}
                            block={{ type: 'experience', index: expIdx }}
                            label={exp.jobTitle || `Experience ${expIdx + 1}`}
                            className="rm-entry"
                        >
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
                        </EditableResumeBlock>
                    ))}
                </section>
            )}

            {data.education && data.education.length > 0 && (
                <section className="rm-section">
                    <div className="rm-sec-label">Education</div>
                    {data.education.map((edu, eduIdx) => (
                        <EditableResumeBlock
                            key={`${edu.degree}-${edu.institution}-${edu.year}`}
                            data={data}
                            editing={editing}
                            block={{ type: 'education', index: eduIdx }}
                            label={edu.degree || `Education ${eduIdx + 1}`}
                            className="rm-entry"
                        >
                            <div className="rm-entry-top">
                                <div className="rm-entry-title">{edu.degree}</div>
                                <div className="rm-entry-period">{edu.year}</div>
                            </div>
                            <div className="rm-entry-org">{edu.institution}</div>
                            {edu.details && <div className="rm-entry-sub">{edu.details}</div>}
                        </EditableResumeBlock>
                    ))}
                </section>
            )}

            {data.skills && Object.keys(data.skills).length > 0 && (
                <EditableResumeBlock data={data} editing={editing} block={{ type: 'skills' }} label="Skills" className="rm-section">
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
                </EditableResumeBlock>
            )}

            {data.projects && data.projects.length > 0 && (
                <section className="rm-section">
                    <div className="rm-sec-label">Projects</div>
                    {data.projects.map((project, projectIdx) => (
                        <EditableResumeBlock
                            key={`${project.title}-${project.description.slice(0, 30)}`}
                            data={data}
                            editing={editing}
                            block={{ type: 'project', index: projectIdx }}
                            label={project.title || `Project ${projectIdx + 1}`}
                            className="rm-project"
                        >
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
                        </EditableResumeBlock>
                    ))}
                </section>
            )}

            {data.certifications && data.certifications.length > 0 && (
                <EditableResumeBlock data={data} editing={editing} block={{ type: 'certifications' }} label="Certifications" className="rm-section">
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
                            className="rm-section"
                        >
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
                        </EditableResumeBlock>
                        )
                    ))
            )}
        </div>
    );
});
