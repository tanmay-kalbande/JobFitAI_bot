import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { CustomSection, Education, Experience, Project, ResumeData, Skills } from '../types';
import { formatSkillCategory } from '../types';

export type ResumeEditBlock =
  | { type: 'header' }
  | { type: 'summary' }
  | { type: 'experience'; index: number }
  | { type: 'skills' }
  | { type: 'project'; index: number }
  | { type: 'education'; index: number }
  | { type: 'certifications' }
  | { type: 'custom'; index: number };

export interface ResumeCanvasEditingProps {
  activeBlock: ResumeEditBlock | null;
  onStartEdit: (block: ResumeEditBlock) => void;
  onCancelEdit: () => void;
  onSaveBlock: (block: ResumeEditBlock, updatedData: ResumeData, description: string) => void;
}

interface EditableResumeBlockProps {
  block: ResumeEditBlock;
  data: ResumeData;
  editing?: ResumeCanvasEditingProps;
  label: string;
  className?: string;
  children: ReactNode;
}

interface HeaderDraft {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  portfolio: string;
}

type EditorDraft =
  | HeaderDraft
  | { summary: string }
  | Experience
  | { skills: Skills }
  | Project
  | Education
  | { certifications: string }
  | CustomSection;

function blockKey(block: ResumeEditBlock): string {
  return 'index' in block ? `${block.type}:${block.index}` : block.type;
}

function isSameBlock(a: ResumeEditBlock | null, b: ResumeEditBlock): boolean {
  return !!a && blockKey(a) === blockKey(b);
}

function splitLines(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);
}

function buildDraft(data: ResumeData, block: ResumeEditBlock): EditorDraft {
  switch (block.type) {
    case 'header':
      return {
        fullName: data.fullName ?? '',
        title: data.title ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
        location: data.location ?? '',
        linkedin: data.linkedin ?? '',
        github: data.github ?? '',
        portfolio: data.portfolio ?? '',
      };
    case 'summary':
      return { summary: data.summary ?? '' };
    case 'experience':
      return { ...(data.experiences?.[block.index] ?? { jobTitle: '', company: '', duration: '', duties: [] }) };
    case 'skills':
      return { skills: { ...(data.skills ?? {}) } };
    case 'project':
      return { ...(data.projects?.[block.index] ?? { title: '', description: '', url: '' }) };
    case 'education':
      return { ...(data.education?.[block.index] ?? { degree: '', institution: '', year: '', details: '' }) };
    case 'certifications':
      return { certifications: (data.certifications ?? []).join('\n') };
    case 'custom':
      return { ...(data.customSections?.[block.index] ?? { title: '', items: [] }) };
    default:
      return { summary: '' };
  }
}

function applyDraft(data: ResumeData, block: ResumeEditBlock, draft: EditorDraft): ResumeData {
  switch (block.type) {
    case 'header':
      return { ...data, ...(draft as HeaderDraft) };
    case 'summary':
      return { ...data, summary: (draft as { summary: string }).summary };
    case 'experience': {
      const experiences = [...(data.experiences ?? [])];
      experiences[block.index] = draft as Experience;
      return { ...data, experiences };
    }
    case 'skills':
      return { ...data, skills: (draft as { skills: Skills }).skills };
    case 'project': {
      const projects = [...(data.projects ?? [])];
      projects[block.index] = draft as Project;
      return { ...data, projects };
    }
    case 'education': {
      const education = [...(data.education ?? [])];
      education[block.index] = draft as Education;
      return { ...data, education };
    }
    case 'certifications':
      return { ...data, certifications: splitLines((draft as { certifications: string }).certifications) };
    case 'custom': {
      const customSections = [...(data.customSections ?? [])];
      customSections[block.index] = draft as CustomSection;
      return { ...data, customSections };
    }
    default:
      return data;
  }
}

function blockDescription(label: string): string {
  return `Manual canvas edit: ${label}`;
}

function TextField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="resume-edit-field">
      <span>{label}</span>
      <input value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  rows = 4,
  onChange,
}: {
  label: string;
  value: string;
  rows?: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="resume-edit-field resume-edit-field-wide">
      <span>{label}</span>
      <textarea rows={rows} value={value} onChange={event => onChange(event.target.value)} />
    </label>
  );
}

function ResumeBlockEditor({
  data,
  block,
  label,
  onSave,
  onCancel,
}: {
  data: ResumeData;
  block: ResumeEditBlock;
  label: string;
  onSave: (updatedData: ResumeData, description: string) => void;
  onCancel: () => void;
}) {
  const initialDraft = useMemo(() => buildDraft(data, block), [data, block]);
  const [draft, setDraft] = useState<EditorDraft>(initialDraft);

  useEffect(() => {
    setDraft(initialDraft);
  }, [initialDraft]);

  const save = () => {
    onSave(applyDraft(data, block, draft), blockDescription(label));
  };

  return (
    <div className="resume-block-editor no-print">
      <div className="resume-block-editor-head">
        <span>Edit {label}</span>
      </div>

      {block.type === 'header' && (
        <div className="resume-edit-grid">
          <TextField label="Name" value={(draft as HeaderDraft).fullName} onChange={value => setDraft({ ...(draft as HeaderDraft), fullName: value })} />
          <TextField label="Title" value={(draft as HeaderDraft).title} onChange={value => setDraft({ ...(draft as HeaderDraft), title: value })} />
          <TextField label="Email" value={(draft as HeaderDraft).email} onChange={value => setDraft({ ...(draft as HeaderDraft), email: value })} />
          <TextField label="Phone" value={(draft as HeaderDraft).phone} onChange={value => setDraft({ ...(draft as HeaderDraft), phone: value })} />
          <TextField label="Location" value={(draft as HeaderDraft).location} onChange={value => setDraft({ ...(draft as HeaderDraft), location: value })} />
          <TextField label="LinkedIn" value={(draft as HeaderDraft).linkedin} onChange={value => setDraft({ ...(draft as HeaderDraft), linkedin: value })} />
          <TextField label="GitHub" value={(draft as HeaderDraft).github} onChange={value => setDraft({ ...(draft as HeaderDraft), github: value })} />
          <TextField label="Portfolio" value={(draft as HeaderDraft).portfolio} onChange={value => setDraft({ ...(draft as HeaderDraft), portfolio: value })} />
        </div>
      )}

      {block.type === 'summary' && (
        <TextAreaField label="Summary" value={(draft as { summary: string }).summary} rows={5} onChange={value => setDraft({ summary: value })} />
      )}

      {block.type === 'experience' && (
        <div className="resume-edit-grid">
          <TextField label="Role" value={(draft as Experience).jobTitle} onChange={value => setDraft({ ...(draft as Experience), jobTitle: value })} />
          <TextField label="Company" value={(draft as Experience).company} onChange={value => setDraft({ ...(draft as Experience), company: value })} />
          <TextField label="Dates" value={(draft as Experience).duration} onChange={value => setDraft({ ...(draft as Experience), duration: value })} />
          <TextAreaField
            label="Bullets"
            value={((draft as Experience).duties ?? []).join('\n')}
            rows={5}
            onChange={value => setDraft({ ...(draft as Experience), duties: splitLines(value) })}
          />
        </div>
      )}

      {block.type === 'skills' && (
        <div className="resume-edit-grid">
          {Object.entries((draft as { skills: Skills }).skills).map(([key, value]) => (
            <TextField
              key={key}
              label={formatSkillCategory(key)}
              value={value}
              onChange={nextValue => setDraft({
                skills: { ...(draft as { skills: Skills }).skills, [key]: nextValue },
              })}
            />
          ))}
        </div>
      )}

      {block.type === 'project' && (
        <div className="resume-edit-grid">
          <TextField label="Project" value={(draft as Project).title} onChange={value => setDraft({ ...(draft as Project), title: value })} />
          <TextField label="URL" value={(draft as Project).url ?? ''} onChange={value => setDraft({ ...(draft as Project), url: value })} />
          <TextAreaField label="Description" value={(draft as Project).description} rows={4} onChange={value => setDraft({ ...(draft as Project), description: value })} />
        </div>
      )}

      {block.type === 'education' && (
        <div className="resume-edit-grid">
          <TextField label="Degree" value={(draft as Education).degree} onChange={value => setDraft({ ...(draft as Education), degree: value })} />
          <TextField label="Institution" value={(draft as Education).institution} onChange={value => setDraft({ ...(draft as Education), institution: value })} />
          <TextField label="Year" value={(draft as Education).year} onChange={value => setDraft({ ...(draft as Education), year: value })} />
          <TextAreaField label="Details" value={(draft as Education).details ?? ''} rows={3} onChange={value => setDraft({ ...(draft as Education), details: value })} />
        </div>
      )}

      {block.type === 'certifications' && (
        <TextAreaField label="Certifications, one per line" value={(draft as { certifications: string }).certifications} rows={5} onChange={value => setDraft({ certifications: value })} />
      )}

      {block.type === 'custom' && (
        <div className="resume-edit-grid">
          <TextField label="Section title" value={(draft as CustomSection).title} onChange={value => setDraft({ ...(draft as CustomSection), title: value })} />
          <TextAreaField
            label="Items, one per line"
            value={((draft as CustomSection).items ?? []).join('\n')}
            rows={5}
            onChange={value => setDraft({ ...(draft as CustomSection), items: splitLines(value) })}
          />
        </div>
      )}

      <div className="resume-edit-actions">
        <button type="button" className="resume-edit-cancel" onClick={onCancel}>Cancel</button>
        <button type="button" className="resume-edit-save" onClick={save}>Save</button>
      </div>
    </div>
  );
}

export function EditableResumeBlock({
  block,
  data,
  editing,
  label,
  className = '',
  children,
}: EditableResumeBlockProps) {
  const isEditing = isSameBlock(editing?.activeBlock ?? null, block);

  if (!editing) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`canvas-edit-block ${isEditing ? 'is-editing' : ''} ${className}`}>
      <button
        type="button"
        className="canvas-edit-btn no-print"
        onClick={() => editing.onStartEdit(block)}
        aria-label={`Edit ${label}`}
      >
        Edit
      </button>
      {children}
      {isEditing && (
        <ResumeBlockEditor
          data={data}
          block={block}
          label={label}
          onCancel={editing.onCancelEdit}
          onSave={(updatedData, description) => editing.onSaveBlock(block, updatedData, description)}
        />
      )}
    </div>
  );
}
