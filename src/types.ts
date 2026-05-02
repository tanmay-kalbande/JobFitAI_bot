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
}

export interface Experience {
  jobTitle: string;
  company: string;
  duration: string;
  duties: string[];
}

export interface Skills {
  [category: string]: string;
}

export function formatSkillCategory(key: string): string {
  const specialCases: Record<string, string> = {
    'mlAi': 'ML/AI',
    'bigData': 'Big Data',
    'devOps': 'DevOps',
    'uiUx': 'UI/UX',
  };
  if (specialCases[key]) return specialCases[key];
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

export interface CoverLetterData {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  linkedin: string;
  portfolio: string;
  location: string;
  date: string;
  recipientName: string;
  recipientTitle: string;
  companyName: string;
  companyLocation: string;
  subject: string;
  greeting: string;
  opening: string;
  body: string[];
  closing: string;
  signoff: string;
  signatureName: string;
}

export type AIProvider = 'google' | 'cerebras' | 'mistral' | 'groq' | 'sambanova' | 'zai' | 'openrouter';

export type ResumeFormat = 'classic' | 'modern' | 'executive';

export interface ProofMapItem {
  requirement: string;
  evidence: string;
  sourceSection: string;
  strength: 'strong' | 'moderate' | 'gap';
  reasoning?: string;
}

export interface ResumeVersion {
  id: string;
  name: string;
  timestamp: number;
  data: ResumeData | CoverLetterData;
  type: 'base' | 'tailored' | 'fixed' | 'cover-letter' | 'cv';
  companyName?: string;
  companyShortName?: string;
  jobTitle?: string;
  atsKeywords?: string[];
  model?: string;
  changes?: string[];
  alignmentScore?: number;
  alignmentDetails?: {
    matchingPoints: string[];
    missingPoints: string[];
  };
  proofMap?: ProofMapItem[];
}

export interface AISettings {
  provider: AIProvider;
  userName: string;
  googleApiKey: string;
  cerebrasApiKey: string;
  mistralApiKey: string;
  groqApiKey: string;
  sambanovaApiKey: string;
  zaiApiKey: string;
  openrouterApiKey: string;
  googleModel: string;
  cerebrasModel: string;
  mistralModel: string;
  groqModel: string;
  sambanovaModel: string;
  zaiModel: string;
  openrouterModel: string;
}

export const DEFAULT_SETTINGS: AISettings = {
  provider: 'google',
  userName: '',
  googleApiKey: '',
  cerebrasApiKey: '',
  mistralApiKey: '',
  groqApiKey: '',
  sambanovaApiKey: '',
  zaiApiKey: '',
  openrouterApiKey: '',
  googleModel: 'gemini-3-flash-preview',
  cerebrasModel: 'qwen-3-235b-a22b-instruct-2507',
  mistralModel: 'mistral-small-latest',
  groqModel: 'llama-3.3-70b-versatile',
  sambanovaModel: 'Meta-Llama-3.3-70B-Instruct',
  zaiModel: 'glm-5',
  openrouterModel: 'minimax/minimax-m2.5:free',
};

// ── Google models ──────────────────────────────────
export const GOOGLE_MODELS = [
  { value: 'gemini-3-flash-preview',        label: 'Gemini 3 Flash' },
  { value: 'gemini-2.5-flash',              label: 'Gemini 2.5 Flash' },
  { value: 'gemini-3.1-flash-lite-preview', label: 'Gemini 3.1 Flash Lite' },
  { value: 'gemini-2.5-flash-lite',         label: 'Gemini 2.5 Flash Lite' },
  { value: 'gemma-4-26b-a4b-it',            label: 'Gemma 4 26B' },
  { value: 'gemma-4-31b-it',                label: 'Gemma 4 31B' },
  { value: 'gemma-3-27b-it',                label: 'Gemma 3 27B' },
];

export const CEREBRAS_MODELS = [
  { value: 'llama3.1-8b',                        label: 'Llama 3.1 8B' },
  { value: 'qwen-3-235b-a22b-instruct-2507',     label: 'Qwen 3 235B A22B' },
];

export const MISTRAL_MODELS = [
  { value: 'mistral-small-latest',  label: 'Mistral Small' },
  { value: 'mistral-medium-latest', label: 'Mistral Medium' },
  { value: 'mistral-large-latest',  label: 'Mistral Large' },
];

export const GROQ_MODELS = [
  { value: 'groq/compound',             label: 'Groq Compound' },
  { value: 'llama-3.3-70b-versatile',   label: 'Llama 3.3 70B Versatile' },
  { value: 'openai/gpt-oss-120b',       label: 'GPT-OSS 120B' },
  { value: 'openai/gpt-oss-20b',        label: 'GPT-OSS 20B' },
  { value: 'qwen/qwen3-32b',            label: 'Qwen 3 32B' },
];

export const SAMBANOVA_MODELS = [
  { value: 'Meta-Llama-3.3-70B-Instruct',       label: 'Meta Llama 3.3 70B Instruct' },
  { value: 'Meta-Llama-3.1-8B-Instruct',        label: 'Meta Llama 3.1 8B Instruct' },
  { value: 'DeepSeek-R1-0528',                   label: 'DeepSeek R1 0528' },
  { value: 'DeepSeek-V3-0324',                   label: 'DeepSeek V3 0324' },
  { value: 'DeepSeek-V3.1',                      label: 'DeepSeek V3.1' },
  { value: 'DeepSeek-R1-Distill-Llama-70B',      label: 'DeepSeek R1 Distill Llama 70B' },
  { value: 'Qwen3-235B-A22B-Instruct-2507',      label: 'Qwen3 235B A22B Instruct 2507' },
  { value: 'Qwen3-32B',                          label: 'Qwen3 32B' },
  { value: 'gpt-oss-120b',                       label: 'GPT-OSS 120B' },
];

export const ZAI_MODELS = [
  { value: 'glm-5.1',    label: 'GLM-5.1' },
  { value: 'glm-5',      label: 'GLM-5' },
  { value: 'glm-5-turbo', label: 'GLM-5-Turbo' },
  { value: 'glm-4.5-x',  label: 'GLM-4.5-X' },
];

export const OPENROUTER_MODELS = [
  { value: 'minimax/minimax-m2.5:free',              label: 'MiniMax M2.5 Free' },
  { value: 'stepfun/step-3.5-flash:free',            label: 'Step 3.5 Flash Free' },
  { value: 'qwen/qwen3.6-plus-preview:free',         label: 'Qwen 3.6 Plus Preview Free' },
  { value: 'openai/gpt-oss-120b:free',               label: 'GPT-OSS 120B Free' },
  { value: 'nvidia/nemotron-3-super-120b-a12b:free', label: 'Nemotron 3 Super 120B Free' },
  { value: 'inclusionai/ling-2.6-flash:free',        label: 'Ling 2.6 Flash Free' },
  { value: 'google/gemma-4-31b-it:free',             label: 'Gemma 4 31B Free' },
];

// Map provider → model list
export const PROVIDER_MODELS_MAP: Record<AIProvider, { value: string; label: string }[]> = {
  google:     GOOGLE_MODELS,
  cerebras:   CEREBRAS_MODELS,
  mistral:    MISTRAL_MODELS,
  groq:       GROQ_MODELS,
  sambanova:  SAMBANOVA_MODELS,
  zai:        ZAI_MODELS,
  openrouter: OPENROUTER_MODELS,
};

// Map provider → AISettings key for its model choice
export const PROVIDER_MODEL_KEY: Record<AIProvider, keyof AISettings> = {
  google:     'googleModel',
  cerebras:   'cerebrasModel',
  mistral:    'mistralModel',
  groq:       'groqModel',
  sambanova:  'sambanovaModel',
  zai:        'zaiModel',
  openrouter: 'openrouterModel',
};

// Provider display metadata
export const PROVIDER_META: { id: AIProvider; label: string; icon: string }[] = [
  { id: 'google',      label: 'Google',     icon: '/gemini.svg' },
  { id: 'cerebras',   label: 'Cerebras',   icon: '/cerebras.svg' },
  { id: 'mistral',    label: 'Mistral',    icon: '/mistral.svg' },
  { id: 'groq',       label: 'Groq',       icon: '/groq.svg' },
  { id: 'sambanova',  label: 'SambaNova',  icon: '/sambanova.svg' },
  { id: 'zai',        label: 'Z.AI',       icon: '/zai.svg' },
  { id: 'openrouter', label: 'OpenRouter', icon: '/openrouter.svg' },
];

export interface ResumeEditLog {
  id: string;
  timestamp: number;
  description: string;
  previousData: ResumeData;
}

export const APP_CONSTANTS = {
  MAX_VERSIONS: 50,        // ← was 20; raised so old docs are never silently dropped
  MAX_OUTPUT_TOKENS: 8192,
  AI_TEMPERATURE: 0.4,
  DEBOUNCE_DELAY_MS: 500,
};

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export function formatTimestamp(ts: number): string {
  const date = new Date(ts);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  if (isToday) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
