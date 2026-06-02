import { memo } from 'react';
import type { ResumeData, ResumeFormat } from '../types';
import { formatSkillCategory } from '../types';
import { EditableResumeBlock, type ResumeCanvasEditingProps } from './ResumeCanvasEditor';

interface ResumeTemplateCompactProps {
  data: ResumeData;
  style?: ResumeFormat;
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



export const ResumeTemplateCompact = memo(function ResumeTemplateCompact({
  data,
  style = 'classic',
  editing,
}: ResumeTemplateCompactProps) {
  const experiences = data.experiences ?? [];
  const projects = data.projects ?? [];
  const certs = data.certifications ?? [];
  const skillEntries = Object.entries(data.skills ?? {});

  const variant = style === 'modern' ? 'compact-modern' : style === 'executive' ? 'compact-executive' : 'compact-classic';

  return (
    <div className={`resume-container compact-resume ${variant}`}>
      <EditableResumeBlock data={data} editing={editing} block={{ type: 'header' }} label="Header" className="compact-header">
        <div className="compact-name-block">
          <h1 className="compact-name">{data.fullName?.toUpperCase() || 'YOUR NAME'}</h1>
          <div className="compact-title">{data.title || 'Your Title'}</div>
        </div>
        <div className="compact-contact">
          {data.email && <span>{data.email}</span>}
          {data.phone && <span>{data.phone}</span>}
          {data.location && <span>{data.location}</span>}
          {isValidUrl(data.linkedin) && (
            <span><a href={data.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a></span>
          )}
          {isValidUrl(data.github) && (
            <span><a href={data.github} target="_blank" rel="noopener noreferrer">GitHub</a></span>
          )}
          {isValidUrl(data.portfolio) && (
            <span><a href={data.portfolio} target="_blank" rel="noopener noreferrer">Portfolio</a></span>
          )}
        </div>
      </EditableResumeBlock>

      <hr className="compact-rule" />

      {data.summary && (
        <EditableResumeBlock data={data} editing={editing} block={{ type: 'summary' }} label="Summary" className="compact-summary-block">
          <p className="compact-summary">{data.summary}</p>
        </EditableResumeBlock>
      )}

      <div className="compact-body">
        <div className="compact-main">
          {experiences.length > 0 && (
            <section className="compact-section">
              <h2 className="compact-section-title">Experience</h2>
              {experiences.map((exp, expIdx) => (
                <EditableResumeBlock
                  key={`${exp.jobTitle}-${exp.company}`}
                  data={data}
                  editing={editing}
                  block={{ type: 'experience', index: expIdx }}
                  label={exp.jobTitle || `Experience ${expIdx + 1}`}
                  className="compact-exp-item"
                >
                  <div className="compact-exp-header">
                    <span className="compact-job-title">{exp.jobTitle}</span>
                    <span className="compact-duration">{exp.duration}</span>
                  </div>
                  <div className="compact-company">{exp.company}</div>
                  {exp.duties && exp.duties.length > 0 && (
                    <ul className="compact-duties">
                      {exp.duties.map((duty) => (
                        <li key={duty.slice(0, 40)}>{duty}</li>
                      ))}
                    </ul>
                  )}
                </EditableResumeBlock>
              ))}
            </section>
          )}

          {projects.length > 0 && (
            <section className="compact-section">
              <h2 className="compact-section-title">Projects</h2>
              {projects.map((proj, projectIdx) => (
                <EditableResumeBlock
                  key={proj.title}
                  data={data}
                  editing={editing}
                  block={{ type: 'project', index: projectIdx }}
                  label={proj.title || `Project ${projectIdx + 1}`}
                  className="compact-project-item"
                >
                  <span className="compact-proj-title">
                    {isValidUrl(proj.url ?? '') ? (
                      <a href={proj.url} target="_blank" rel="noopener noreferrer">{proj.title}</a>
                    ) : proj.title}
                  </span>
                  {' - '}
                  <span className="compact-proj-desc">{proj.description}</span>
                </EditableResumeBlock>
              ))}
            </section>
          )}
        </div>

        <div className="compact-sidebar">
          {skillEntries.length > 0 && (
            <EditableResumeBlock data={data} editing={editing} block={{ type: 'skills' }} label="Skills" className="compact-section">
              <h2 className="compact-section-title">Skills</h2>
              <div className="compact-skills">
                {skillEntries.map(([cat, val]) => val && (
                  <div key={cat} className="compact-skill-row">
                    <span className="compact-skill-cat">{formatSkillCategory(cat)}</span>
                    <span className="compact-skill-val">{val}</span>
                  </div>
                ))}
              </div>
            </EditableResumeBlock>
          )}

          {data.education && data.education.length > 0 && (
            <section className="compact-section">
              <h2 className="compact-section-title">Education</h2>
              {data.education.map((edu, eduIdx) => (
                <EditableResumeBlock
                  key={`${edu.degree}-${edu.institution}`}
                  data={data}
                  editing={editing}
                  block={{ type: 'education', index: eduIdx }}
                  label={edu.degree || `Education ${eduIdx + 1}`}
                  className="compact-edu-item"
                >
                  <div className="compact-degree">{edu.degree}</div>
                  <div className="compact-institution">{edu.institution}</div>
                  <div className="compact-year">{edu.year}</div>
                </EditableResumeBlock>
              ))}
            </section>
          )}

          {certs.length > 0 && (
            <EditableResumeBlock data={data} editing={editing} block={{ type: 'certifications' }} label="Certifications" className="compact-section">
              <h2 className="compact-section-title">Certifications</h2>
              {certs.map((cert) => {
                const pipeIdx = cert.indexOf('|');
                const name = pipeIdx > -1 ? cert.slice(0, pipeIdx).trim() : cert.trim();
                const meta = pipeIdx > -1 ? cert.slice(pipeIdx + 1).trim() : '';
                return (
                  <div key={cert.slice(0, 40)} className="compact-cert-item">
                    <span className="compact-cert-name">{name}</span>
                    {meta && <span className="compact-cert-meta">{meta}</span>}
                  </div>
                );
              })}
            </EditableResumeBlock>
          )}
        </div>
      </div>
    </div>
  );
});
