export interface ResumeData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  location: string;
  summary: string;
  experiences: Experience[];
  skills: Skills;
  projects: Project[];
  certifications: string[];
  education?: Education[];
  customSections?: CustomSection[];
  _raw?: string;
}

export interface Experience {
  jobTitle: string;
  company: string;
  duration: string;
  duties: string[];
}

export interface Skills {
  // Flexible skills - any category can be added
  [category: string]: string;
}

// Helper to format skill category names for display
export function formatSkillCategory(key: string): string {
  // Handle common abbreviations
  const specialCases: Record<string, string> = {
    'mlAi': 'ML/AI',
    'bigData': 'Big Data',
    'devOps': 'DevOps',
    'uiUx': 'UI/UX',
  };

  if (specialCases[key]) return specialCases[key];

  // Convert camelCase to Title Case with spaces
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}


export interface Project {
  title: string;
  description: string;
  url?: string;
}

export interface Education {
  degree: string;
  institution: string;
  year: string;
  details?: string;
}

export interface CustomSection {
  title: string;
  items: string[];
}

export type AIProvider = 'google' | 'cerebras' | 'mistral';

// Resume version for history tracking
export interface ResumeVersion {
  id: string;
  name: string;
  timestamp: number;
  data: ResumeData;
  type: 'base' | 'tailored' | 'fixed';
  companyName?: string;
  jobTitle?: string;
  atsKeywords?: string[];
  changes?: string[]; // AI-generated list of changes made
  alignmentScore?: number; // 0-100 job match percentage
  alignmentDetails?: {
    matchingPoints: string[];
    missingPoints: string[];
  };
}

export interface AISettings {
  provider: AIProvider;
  userName: string;  // User's name for PDF file naming
  googleApiKey: string;
  cerebrasApiKey: string;
  mistralApiKey: string;
  googleModel: string;
  cerebrasModel: string;
  mistralModel: string;
}

export const DEFAULT_SETTINGS: AISettings = {
  provider: 'google',
  userName: '',
  googleApiKey: '',
  cerebrasApiKey: '',
  mistralApiKey: '',
  googleModel: 'gemini-3-flash-preview',
  cerebrasModel: 'gpt-oss-120b',
  mistralModel: 'mistral-small-latest'
};

// Model options for each provider
export const GOOGLE_MODELS = [
  { value: 'gemini-3-flash-preview', label: 'Gemini 3 Flash' },
  { value: 'gemma-3-27b-it', label: 'Gemma 3 27B' },
];

export const CEREBRAS_MODELS = [
  { value: 'llama-3.3-70b', label: 'Llama 3.3 70B' },
  { value: 'gpt-oss-120b', label: 'GPT-OSS 120B' },
  { value: 'zai-glm-4.7', label: 'ZAI GLM 4.7' },
];

export const MISTRAL_MODELS = [
  { value: 'mistral-small-latest', label: 'Mistral Small' },
  { value: 'mistral-medium-latest', label: 'Mistral Medium' },
  { value: 'mistral-large-latest', label: 'Mistral Large' },
];

// Application constants
export const APP_CONSTANTS = {
  MAX_VERSIONS: 20,
  MAX_OUTPUT_TOKENS: 8192,
  AI_TEMPERATURE: 0.4,
  DEBOUNCE_DELAY_MS: 500,
};

// Helper to generate unique IDs
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

// Helper to format timestamp
export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}



