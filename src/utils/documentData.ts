import type {
  CoverLetterData,
  ResumeData,
  ResumeEditLog,
  ResumeVersion,
} from '../types';

export function sanitizeFilePart(value: string | undefined): string {
  if (!value) return '';

  return value
    .trim()
    .replace(/[^\w\s-]/g, ' ')
    .replace(/[_\s-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function cleanAIText(text: string): string {
  if (!text) return text;
  return text.replace(/[\u2014\u2013]/g, '-');
}

export function normalizeLocationText(location: string | undefined): string {
  const cleaned = cleanAIText(location ?? '').trim().replace(/\s+/g, ' ');
  if (!cleaned) return '';

  const mentionsRelocation = /\b(open|willing|available)\s+(?:to|for)\s+relocat/i.test(cleaned)
    || /\brelocation\b/i.test(cleaned)
    || (/\bpan\s*india\b/i.test(cleaned) && /\b(open|willing|available|relocat)/i.test(cleaned));

  return mentionsRelocation ? 'Open to relocate' : cleaned;
}

export function cleanResumeData(data: ResumeData): ResumeData {
  const experiences = Array.isArray(data.experiences) ? data.experiences : [];
  const education = Array.isArray(data.education) ? data.education : [];
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const customSections = Array.isArray(data.customSections) ? data.customSections : [];
  const certifications = Array.isArray(data.certifications) ? data.certifications : [];
  const skills = data.skills && typeof data.skills === 'object' ? data.skills : {};

  return {
    ...data,

    fullName: cleanAIText(data.fullName),
    title: cleanAIText(data.title),
    location: normalizeLocationText(data.location),
    summary: cleanAIText(data.summary),
    experiences: experiences.map(exp => ({
      ...exp,
      jobTitle: cleanAIText(exp.jobTitle),
      company: cleanAIText(exp.company),
      duties: Array.isArray(exp.duties) ? exp.duties.map(duty => cleanAIText(duty)) : [],
    })),
    education: education.map(edu => ({
      ...edu,
      degree: cleanAIText(edu.degree),
      institution: cleanAIText(edu.institution),
      details: edu.details ? cleanAIText(edu.details) : edu.details,
    })),
    skills: Object.keys(skills).reduce((acc, key) => {
      acc[key] = cleanAIText(skills[key]);
      return acc;
    }, {} as Record<string, string>),
    projects: projects.map(proj => ({
      ...proj,
      title: cleanAIText(proj.title),
      description: cleanAIText(proj.description),
      url: proj.url ? cleanAIText(proj.url) : proj.url,
    })),
    customSections: customSections.map(section => ({
      ...section,
      title: cleanAIText(section.title),
      items: Array.isArray(section.items) ? section.items.map(item => cleanAIText(item)) : [],
    })),
    certifications: certifications.map(cert => cleanAIText(cert)),
  };
}

export function cleanCoverLetterData(data: CoverLetterData): CoverLetterData {
  return {
    ...data,
    fullName: cleanAIText(data.fullName),
    title: cleanAIText(data.title),
    location: normalizeLocationText(data.location),
    opening: cleanAIText(data.opening),
    body: Array.isArray(data.body) ? data.body.map(line => cleanAIText(line)) : [],
    closing: cleanAIText(data.closing),
    signoff: cleanAIText(data.signoff),
    signatureName: cleanAIText(data.signatureName),
  };
}

function isCoverLetterVersion(version: ResumeVersion): version is ResumeVersion & { data: CoverLetterData } {
  return version.type === 'cover-letter'
    && typeof version.data === 'object'
    && version.data !== null
    && 'opening' in version.data
    && 'body' in version.data
    && 'signoff' in version.data;
}

export function cleanResumeVersion(version: ResumeVersion): ResumeVersion {
  if (isCoverLetterVersion(version)) {
    return {
      ...version,
      data: cleanCoverLetterData(version.data),
    };
  }

  return {
    ...version,
    data: cleanResumeData(version.data as ResumeData),
  };
}

export function cleanResumeVersions(versions: ResumeVersion[]): ResumeVersion[] {
  return versions.map(cleanResumeVersion);
}

export function cleanResumeEditLogs(editLogs: ResumeEditLog[]): ResumeEditLog[] {
  return editLogs.map(log => ({
    ...log,
    previousData: cleanResumeData(log.previousData),
  }));
}
