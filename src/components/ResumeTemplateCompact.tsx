import { memo } from 'react';
import type { ResumeData, ResumeFormat } from '../types';
import { formatSkillCategory } from '../types';

interface ResumeTemplateCompactProps {
  data: ResumeData;
  style?: ResumeFormat; // 'classic' | 'modern' | 'executive'
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

function truncate(text: string, maxChars: number): string {
  if (!text) return '';
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars).trimEnd() + '…';
}

export const ResumeTemplateCompact = memo(function ResumeTemplateCompact({
  data,
  style = 'classic',
}: ResumeTemplateCompactProps) {
  const MAX_JOBS     = 3;
  const MAX_BULLETS  = 3;
  const MAX_PROJECTS = 2;
  const MAX_CERTS    = 3;

  const experiences  = (data.experiences ?? []).slice(0, MAX_JOBS);
  const projects     = (data.projects ?? []).slice(0, MAX_PROJECTS);
  const certs        = (data.certifications ?? []).slice(0, MAX_CERTS);
  const skillEntries = Object.entries(data.skills ?? {});

  // CSS class suffix drives all visual variants via App.css
  const variant = style === 'modern' ? 'compact-modern' : style === 'executive' ? 'compact-executive' : 'compact-classic';

  return (
    <div className={`resume-container compact-resume ${variant}`}>

      {/* ── Header ── */}
      <div className="compact-header">
        <div className="compact-name-block">
          <h1 className="compact-name">{data.fullName?.toUpperCase() || 'YOUR NAME'}</h1>
          <div className="compact-title">{data.title || 'Your Title'}</div>
        </div>
        <div className="compact-contact">
          {data.email    && <span>{data.email}</span>}
          {data.phone    && <span>{data.phone}</span>}
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
      </div>

      <hr className="compact-rule" />

      {/* ── Summary ── */}
      {data.summary && (
        <p className="compact-summary">{truncate(data.summary, 300)}</p>
      )}

      {/* ── Two-column body ── */}
      <div className="compact-body">

        {/* Left: Experience + Projects */}
        <div className="compact-main">
          {experiences.length > 0 && (
            <section className="compact-section">
              <h2 className="compact-section-title">Experience</h2>
              {experiences.map((exp) => (
                <div key={`${exp.jobTitle}-${exp.company}`} className="compact-exp-item">
                  <div className="compact-exp-header">
                    <span className="compact-job-title">{exp.jobTitle}</span>
                    <span className="compact-duration">{exp.duration}</span>
                  </div>
                  <div className="compact-company">{exp.company}</div>
                  {exp.duties && exp.duties.length > 0 && (
                    <ul className="compact-duties">
                      {exp.duties.slice(0, MAX_BULLETS).map((duty) => (
                        <li key={duty.slice(0, 40)}>{truncate(duty, 120)}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          )}

          {projects.length > 0 && (
            <section className="compact-section">
              <h2 className="compact-section-title">Projects</h2>
              {projects.map((proj) => (
                <div key={proj.title} className="compact-project-item">
                  <span className="compact-proj-title">
                    {isValidUrl(proj.url ?? '') ? (
                      <a href={proj.url} target="_blank" rel="noopener noreferrer">{proj.title}</a>
                    ) : proj.title}
                  </span>
                  {' — '}
                  <span className="compact-proj-desc">{truncate(proj.description, 100)}</span>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Right: Skills + Education + Certs */}
        <div className="compact-sidebar">
          {skillEntries.length > 0 && (
            <section className="compact-section">
              <h2 className="compact-section-title">Skills</h2>
              <div className="compact-skills">
                {skillEntries.map(([cat, val]) => val && (
                  <div key={cat} className="compact-skill-row">
                    <span className="compact-skill-cat">{formatSkillCategory(cat)}</span>
                    <span className="compact-skill-val">{val}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {data.education && data.education.length > 0 && (
            <section className="compact-section">
              <h2 className="compact-section-title">Education</h2>
              {data.education.slice(0, 2).map((edu) => (
                <div key={`${edu.degree}-${edu.institution}`} className="compact-edu-item">
                  <div className="compact-degree">{edu.degree}</div>
                  <div className="compact-institution">{edu.institution}</div>
                  <div className="compact-year">{edu.year}</div>
                </div>
              ))}
            </section>
          )}

          {certs.length > 0 && (
            <section className="compact-section">
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
});
