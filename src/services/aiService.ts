import type { ResumeData, CoverLetterData, AISettings, ProofMapItem } from '../types';
import { APP_CONSTANTS } from '../types';

const GOOGLE_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';
const CEREBRAS_API_URL = 'https://api.cerebras.ai/v1/chat/completions';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const SAMBANOVA_API_URL = 'https://api.sambanova.ai/v1/chat/completions';
const ZAI_API_URL = 'https://api.z.ai/api/paas/v4/chat/completions';
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

type AIMessage = {
    role: 'system' | 'user';
    content: string;
};

type OpenAICompatibleProvider = Exclude<AISettings['provider'], 'google'>;

interface ChatCompletionResponse {
    choices?: Array<{
        message?: {
            content?: unknown;
        };
    }>;
}

interface GoogleResponsePart {
    text?: string;
    thought?: boolean;
}

interface GoogleCandidate {
    content?: {
        parts?: GoogleResponsePart[];
    };
}

interface GoogleGenerateContentResponse {
    candidates?: GoogleCandidate[];
}

interface GoogleGenerateContentBody {
    contents: Array<{
        role: 'user';
        parts: Array<{ text: string }>;
    }>;
    generationConfig: {
        temperature: number;
        maxOutputTokens: number;
        responseMimeType?: 'application/json';
    };
    system_instruction?: {
        parts: Array<{ text: string }>;
    };
}

interface OpenAICompatibleProviderConfig {
    label: string;
    url: string;
    getApiKey: (settings: AISettings) => string;
    getModel: (settings: AISettings) => string;
    getHeaders?: (settings: AISettings) => Record<string, string>;
    getMaxTokens?: () => number;
    getBodyExtras?: (prompt: string) => Record<string, unknown>;
    transformError?: (error: string) => string;
}

const CORE_SYSTEM_PROMPT = `You are JobFit — a senior-level resume strategist who thinks like a hiring manager and writes for ATS parsers.

You operate at the intersection of three perspectives:
• RECRUITER LENS — You know recruiters spend ~7 seconds on a first pass. Lead with the strongest signal. Front-load impact.
• ATS LENS — You understand that Applicant Tracking Systems tokenize resumes. Place high-value keywords early in bullets, in the summary, and in skill labels. Use the exact phrasing from the job description when the candidate's experience genuinely supports it.
• CANDIDATE LENS — You are the candidate's advocate. You never fabricate, but you frame every truthful detail in its most compelling light.

WRITING STANDARDS:
• Bullets MUST follow the STAR-lite format: strong action verb → what was done → measurable result or concrete outcome. If no metric exists, describe the observable impact (e.g., "reduced manual effort", "improved team velocity").
• Use active voice. Eliminate filler words ("responsible for", "helped with", "assisted in"). Every word must earn its place.
• Mirror the job description's exact terminology when the resume already provides supporting evidence.
• Vary action verbs — never start two consecutive bullets with the same verb.

NON-NEGOTIABLE RULES:
1. NEVER invent facts — no fabricated employers, dates, degrees, certifications, projects, tools, URLs, metrics, or achievements.
2. Preserve all original resume sections and content unless the user explicitly asks to remove something.
3. When tailoring to a job description, emphasize the strongest matching evidence already present before introducing any new phrasing.
4. If a job requirement is not supported by the resume, acknowledge the gap honestly — frame transferable skills where applicable but never pretend the candidate has direct experience they lack.
5. If the task asks for JSON, return valid JSON only, matching the requested schema exactly. Never wrap JSON in markdown fences.
6. Maintain consistent formatting: uniform date formats, parallel bullet structure, and proper capitalization throughout.`;


// Retry utility with exponential backoff
async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    baseDelay: number = 1000
): Promise<T> {
    let lastError: Error | undefined;
    for (let i = 0; i < retries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
            }
        }
    }
    throw lastError;
}

// Global abort controller for cancelling in-flight requests
let currentAbortController: AbortController | null = null;

export function cancelCurrentRequest() {
    if (currentAbortController) {
        currentAbortController.abort();
        currentAbortController = null;
    }
}

function isGptOss(settings: AISettings): boolean {
    return (
        (settings.provider === 'cerebras' && settings.cerebrasModel === 'gpt-oss-120b') ||
        (settings.provider === 'groq' && !!settings.groqModel && settings.groqModel.toLowerCase().includes('gpt-oss')) ||
        (settings.provider === 'openrouter' && !!settings.openrouterModel && settings.openrouterModel.toLowerCase().includes('gpt-oss'))
    );
}

function getFinalPrompt(prompt: string, settings: AISettings): string {
    if (isGptOss(settings)) {
        return prompt;
    }

    return `${prompt}

[QUALITY GATE]
- Every section from the original resume must appear in the output — do not silently drop Education, Projects, Certifications, Custom Sections, or URLs.
- Every bullet must start with a strong action verb and include a concrete outcome.
- All claims must be traceable to the source resume data.`;
}

function buildMessages(prompt: string, settings: AISettings): AIMessage[] {
    return [
        { role: 'system', content: CORE_SYSTEM_PROMPT },
        { role: 'user', content: getFinalPrompt(prompt, settings) },
    ];
}

function expectsJsonResponse(prompt: string): boolean {
    return /return\s+only\s+(?:a\s+)?(?:valid\s+)?json|return\s+only\s+this\s+json|return\s+format:\s*\[|json object|json array/i.test(prompt);
}

function readChatMessageContent(content: unknown): string {
    if (typeof content === 'string') {
        return content;
    }

    if (Array.isArray(content)) {
        return content
            .map(item => {
                if (typeof item === 'string') {
                    return item;
                }

                if (item && typeof item === 'object' && 'text' in item) {
                    return typeof item.text === 'string' ? item.text : '';
                }

                return '';
            })
            .join('');
    }

    return '';
}

function isGoogleGemma4Model(model: string): boolean {
    return /^gemma-4-/i.test(model);
}

function readGoogleResponseText(candidate: GoogleCandidate | undefined, model: string): string {
    const parts = candidate?.content?.parts;
    if (!Array.isArray(parts)) {
        return '';
    }

    if (!isGoogleGemma4Model(model)) {
        return parts.find((part): part is GoogleResponsePart => !!part && typeof part.text === 'string')?.text || '';
    }

    const visibleText = parts
        .filter((part): part is GoogleResponsePart => !!part && typeof part.text === 'string' && !part.thought)
        .map(part => part.text ?? '')
        .join('');

    if (visibleText) {
        return visibleText;
    }

    return parts
        .filter((part): part is GoogleResponsePart => !!part && typeof part.text === 'string')
        .map(part => part.text ?? '')
        .join('');
}

function isGoogleGemmaModel(model: string): boolean {
    return /^gemma-/i.test(model);
}

function formatSambaNovaError(error: string): string {
    if (error.toLowerCase().includes('valid service tier')) {
        return `SambaNova API error: ${error}. MiniMax-M2.5 appears to be listed in your account, but this API key or account tier is not currently authorized for the request. Try another SambaNova model or contact SambaNova support.`;
    }

    return `SambaNova API error: ${error}`;
}

function formatOpenRouterError(error: string): string {
    const normalizedError = error.toLowerCase();
    if (
        normalizedError.includes('no endpoints available matching your guardrail restrictions and data policy') ||
        normalizedError.includes('configure: https://openrouter.ai/settings/privacy')
    ) {
        return 'OpenRouter API error: no provider matched your current OpenRouter privacy settings for this model. Open OpenRouter Settings > Privacy and allow compatible providers, or choose another OpenRouter model.';
    }

    return `OpenRouter API error: ${error}`;
}

const OPENAI_COMPAT_PROVIDERS: Record<OpenAICompatibleProvider, OpenAICompatibleProviderConfig> = {
    cerebras: {
        label: 'Cerebras',
        url: CEREBRAS_API_URL,
        getApiKey: settings => settings.cerebrasApiKey,
        getModel: settings => settings.cerebrasModel,
    },
    mistral: {
        label: 'Mistral',
        url: MISTRAL_API_URL,
        getApiKey: settings => settings.mistralApiKey,
        getModel: settings => settings.mistralModel,
    },
    groq: {
        label: 'Groq',
        url: GROQ_API_URL,
        getApiKey: settings => settings.groqApiKey,
        getModel: settings => settings.groqModel,
        getMaxTokens: () => 3300,
    },
    sambanova: {
        label: 'SambaNova',
        url: SAMBANOVA_API_URL,
        getApiKey: settings => settings.sambanovaApiKey,
        getModel: settings => settings.sambanovaModel,
        getBodyExtras: prompt => expectsJsonResponse(prompt) ? { response_format: { type: 'json_object' } } : {},
        transformError: formatSambaNovaError,
    },
    zai: {
        label: 'Z.AI',
        url: ZAI_API_URL,
        getApiKey: settings => settings.zaiApiKey,
        getModel: settings => settings.zaiModel,
        getHeaders: () => ({ 'Accept-Language': 'en-US,en' }),
    },
    openrouter: {
        label: 'OpenRouter',
        url: OPENROUTER_API_URL,
        getApiKey: settings => settings.openrouterApiKey,
        getModel: settings => settings.openrouterModel,
        transformError: formatOpenRouterError,
    },
};

function normalizeJsonCandidate(text: string): string {
    return text
        .replace(/^\uFEFF/, '')
        .replace(/```(?:json)?/gi, '')
        .replace(/```/g, '')
        .replace(/[“”]/g, '"')
        .replace(/[‘’]/g, "'")
        .replace(/,\s*([}\]])/g, '$1')
        .trim();
}

function findBalancedJsonSegment(text: string): string | null {
    for (let start = 0; start < text.length; start++) {
        const firstChar = text[start];
        if (firstChar !== '{' && firstChar !== '[') {
            continue;
        }

        let depth = 0;
        let inString = false;
        let isEscaped = false;

        for (let index = start; index < text.length; index++) {
            const char = text[index];

            if (inString) {
                if (isEscaped) {
                    isEscaped = false;
                    continue;
                }

                if (char === '\\') {
                    isEscaped = true;
                    continue;
                }

                if (char === '"') {
                    inString = false;
                }

                continue;
            }

            if (char === '"') {
                inString = true;
                continue;
            }

            if (char === '{' || char === '[') {
                depth++;
                continue;
            }

            if (char === '}' || char === ']') {
                depth--;
                if (depth === 0) {
                    return text.slice(start, index + 1);
                }
            }
        }
    }

    return null;
}

export function parseJSONResponse<T>(text: string): T {
    const normalizedText = normalizeJsonCandidate(text);
    const extractedText = extractJSON(normalizedText);
    const balancedText = findBalancedJsonSegment(normalizedText);

    const candidates = [
        text,
        normalizedText,
        extractedText,
        normalizeJsonCandidate(extractedText),
        balancedText ?? '',
        balancedText ? normalizeJsonCandidate(balancedText) : '',
    ].filter((candidate, index, all): candidate is string => !!candidate && all.indexOf(candidate) === index);

    let lastError: Error | null = null;

    for (const candidate of candidates) {
        try {
            return JSON.parse(candidate) as T;
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
        }
    }

    throw lastError ?? new Error('Failed to parse JSON response');
}

async function callGoogleAI(messages: AIMessage[], settings: AISettings): Promise<string> {
    const [systemMessage, userMessage] = messages;

    const isGemmaModel = isGoogleGemmaModel(settings.googleModel);
    const supportsSystemInstruction = !isGemmaModel;
    const supportsResponseMimeType = !isGemmaModel;

    const body: GoogleGenerateContentBody = {
        contents: [],
        generationConfig: {
            temperature: APP_CONSTANTS.AI_TEMPERATURE,
            maxOutputTokens: APP_CONSTANTS.MAX_OUTPUT_TOKENS,
            ...(supportsResponseMimeType && expectsJsonResponse(userMessage.content)
                ? { responseMimeType: 'application/json' }
                : {}),
        },
    };

    if (supportsSystemInstruction) {
        body.system_instruction = { parts: [{ text: systemMessage.content }] };
        body.contents = [{ role: 'user', parts: [{ text: userMessage.content }] }];
    } else {
        // Prepend system message to user message for models that don't support system_instruction
        const combinedContent = `[SYSTEM INSTRUCTION]\n${systemMessage.content}\n\n[USER REQUEST]\n${userMessage.content}`;
        body.contents = [{ role: 'user', parts: [{ text: combinedContent }] }];
    }

    const response = await fetch(
        `${GOOGLE_API_URL}/${settings.googleModel}:generateContent?key=${settings.googleApiKey}`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: currentAbortController?.signal,
            body: JSON.stringify(body),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google AI API error: ${error}`);
    }

    const data = await response.json() as GoogleGenerateContentResponse;
    return readGoogleResponseText(data.candidates?.[0], settings.googleModel);
}

async function callOpenAICompatProvider(
    provider: OpenAICompatibleProvider,
    messages: AIMessage[],
    prompt: string,
    settings: AISettings
): Promise<string> {
    const config = OPENAI_COMPAT_PROVIDERS[provider];
    const response = await fetch(config.url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.getApiKey(settings)}`,
            ...(config.getHeaders?.(settings) ?? {}),
        },
        signal: currentAbortController?.signal,
        body: JSON.stringify({
            model: config.getModel(settings),
            messages,
            temperature: APP_CONSTANTS.AI_TEMPERATURE,
            max_tokens: config.getMaxTokens?.() ?? APP_CONSTANTS.MAX_OUTPUT_TOKENS,
            ...(config.getBodyExtras?.(prompt) ?? {}),
        }),
    });

    if (!response.ok) {
        const error = await response.text();
        throw new Error(config.transformError ? config.transformError(error) : `${config.label} API error: ${error}`);
    }

    const data = await response.json() as ChatCompletionResponse;
    return readChatMessageContent(data.choices?.[0]?.message?.content);
}

export async function callAI(prompt: string, settings: AISettings): Promise<string> {
    // Cancel any existing request
    cancelCurrentRequest();
    currentAbortController = new AbortController();
    const messages = buildMessages(prompt, settings);

    const makeCall = async (): Promise<string> => {
        if (settings.provider === 'google') {
            if (!settings.googleApiKey) throw new Error('Google API key is required');
            return callGoogleAI(messages, settings);
        }

        const providerConfig = OPENAI_COMPAT_PROVIDERS[settings.provider];
        if (!providerConfig.getApiKey(settings)) {
            throw new Error(`${providerConfig.label} API key is required`);
        }

        return callOpenAICompatProvider(settings.provider, messages, prompt, settings);
    };

    try {
        return await retryWithBackoff(makeCall, 3, 1000);
    } finally {
        currentAbortController = null;
    }
}

export function extractJSON(text: string): string {
    // 1. Try to extract from markdown code blocks first (most reliable)
    const trimmedText = text.trim();
    const jsonMatch = trimmedText.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (jsonMatch) return normalizeJsonCandidate(jsonMatch[1]);

    const normalizedText = normalizeJsonCandidate(trimmedText);

    // 2. Try to find the outermost JSON object or array
    const balancedJson = findBalancedJsonSegment(normalizedText);
    if (balancedJson) {
        return balancedJson;
    }

    // 3. Fallback: simple start/end search (legacy behavior)
    const objectStart = normalizedText.indexOf('{');
    const objectEnd = normalizedText.lastIndexOf('}');
    if (objectStart !== -1 && objectEnd !== -1) {
        return normalizedText.slice(objectStart, objectEnd + 1);
    }

    const arrayStart = normalizedText.indexOf('[');
    const arrayEnd = normalizedText.lastIndexOf(']');
    if (arrayStart !== -1 && arrayEnd !== -1) {
        return normalizedText.slice(arrayStart, arrayEnd + 1);
    }

    return normalizedText;
}

export async function generateBaseResume(
    resumeData: string,
    settings: AISettings
): Promise<ResumeData> {
    const prompt = `Extract, structure, and lightly polish the following resume into a clean, ATS-ready JSON format.

TASK: Parse the raw resume text below and return ONLY a valid JSON object (no markdown, no explanation) with this exact schema:
{
  "fullName": "string",
  "title": "string — use the candidate's stated title. If none is given, infer from the most recent role.",
  "email": "string",
  "phone": "string",
  "linkedin": "string (full URL, or empty string)",
  "github": "string (full URL, or empty string)",
  "portfolio": "string (full URL, or empty string)",
  "location": "string",
  "summary": "string — a 2-4 sentence professional summary. If the resume already has one, improve it for clarity and impact. If none exists, synthesize one from the candidate's experience and skills. Lead with years of experience and domain, then top skills, then a career-direction statement.",
  "education": [
    {
      "degree": "string",
      "institution": "string",
      "year": "string — normalize to 'Mon YYYY - Mon YYYY' or 'Mon YYYY' format",
      "details": "string — GPA, honors, relevant coursework, or empty string"
    }
  ],
  "customSections": [
    {
      "title": "string — section name (e.g., Awards, Languages, Volunteering, Publications)",
      "items": ["string"]
    }
  ],
  "experiences": [
    {
      "jobTitle": "string",
      "company": "string",
      "duration": "string — normalize to 'Mon YYYY - Mon YYYY' or 'Mon YYYY - Present'",
      "duties": ["string — each bullet as a STAR-lite statement: action verb → what → outcome"]
    }
  ],
  "skills": {
    "Use category keys appropriate for this candidate's domain. Common keys: languages, frameworks, databases, mlAi, visualization, bigData, devOps, cloud, tools, methodologies, softSkills. Each value is a comma-separated string. Use camelCase keys. Include only categories that have entries."
  },
  "projects": [
    {
      "title": "string",
      "description": "string — concise, outcome-focused. Do NOT include URLs here.",
      "url": "string — extract any GitHub, demo, or deployment URL found near this project. Empty string if none."
    }
  ],
  "certifications": ["Cert Name | Issuer · Date", ...]
}

EXTRACTION RULES:
1. Return ONLY valid JSON — no markdown fences, no commentary.
2. EDUCATION IS MANDATORY: If the resume mentions any college, university, degree, diploma, or bootcamp, it MUST appear in the "education" array. Never leave it empty when education info exists.
3. DEDUPLICATION: Each item belongs in exactly one place. Certifications go in "certifications", not also in "customSections". Education goes in "education", not also in "customSections".
4. SKILL CATEGORIES: Adapt categories to the candidate's actual domain. A marketing professional should have categories like "tools", "platforms", "analytics" — not "mlAi" or "bigData". A developer might use "languages", "frameworks", "cloud". Use your judgment to create 3-7 meaningful categories.
5. PROJECT URLs: Scan the surrounding text for any URL associated with a project (GitHub links, live demos, deployed sites). Put them in the "url" field, never in "description".
6. CERTIFICATIONS FORMAT: "Certification Name | Issuer · Date". Example: "AWS Cloud Technical Essentials | Amazon Web Services · Dec 2024". If only the name exists, use just the name.
7. BULLET IMPROVEMENT: While extracting, upgrade weak bullets. Change "Responsible for managing team" → "Led a cross-functional team of 5 engineers to deliver..." — but only when the original text provides enough context. Never invent details.
8. DATE NORMALIZATION: Convert all dates to consistent "Mon YYYY" format (e.g., "Apr 2024").

RESUME TEXT TO EXTRACT:
${resumeData}

Return ONLY the JSON object.`;

    const response = await callAI(prompt, settings);
    const jsonStr = extractJSON(response);

    try {
        const data = parseJSONResponse<ResumeData>(response);
        // Ensure arrays exist
        if (!data.education) data.education = [];
        if (!data.customSections) data.customSections = [];
        return data;
    } catch {
        console.error('Failed to parse JSON:', jsonStr);
        throw new Error('Failed to parse AI response as JSON. Please try again.');
    }
}

export interface TailoredResumeResult {
    resume: ResumeData;
    changes: string[];
    companyName: string;
    companyShortName?: string;
    jobTitle: string;
    alignmentScore: number;
    alignmentDetails: {
        matchingPoints: string[];
        missingPoints: string[];
    };
    proofMap: ProofMapItem[];
}

export interface GeneratedCVResult {
    cv: ResumeData;
    changes: string[];
    companyName: string;
    companyShortName?: string;
    jobTitle: string;
    proofMap: ProofMapItem[];
}

export interface GeneratedCoverLetterResult {
    coverLetter: CoverLetterData;
    changes: string[];
    companyName: string;
    companyShortName?: string;
    jobTitle: string;
    proofMap: ProofMapItem[];
}

function normalizeProofMap(items: unknown): ProofMapItem[] {
    if (!Array.isArray(items)) {
        return [];
    }

    const normalized: ProofMapItem[] = [];

    for (const item of items) {
        if (!item || typeof item !== 'object') {
            continue;
        }

        const entry = item as Record<string, unknown>;
        const requirement = typeof entry.requirement === 'string' ? entry.requirement : '';
        if (!requirement) {
            continue;
        }

        const strength = typeof entry.strength === 'string' ? entry.strength.toLowerCase() : 'moderate';
        const normalizedStrength: ProofMapItem['strength'] =
            strength === 'strong' || strength === 'moderate' || strength === 'gap'
                ? strength
                : 'moderate';

        normalized.push({
            requirement,
            evidence: typeof entry.evidence === 'string' ? entry.evidence : '',
            sourceSection: typeof entry.sourceSection === 'string' ? entry.sourceSection : 'General',
            strength: normalizedStrength,
            reasoning: typeof entry.reasoning === 'string' ? entry.reasoning : undefined,
        });
    }

    return normalized;
}

function restorePreservedSections(resultResume: ResumeData, originalResumeData: string): ResumeData {
    try {
        const original = JSON.parse(originalResumeData) as ResumeData;

        if (!resultResume.education || resultResume.education.length === 0) {
            resultResume.education = original.education && original.education.length > 0
                ? original.education
                : [];
        }

        if (!resultResume.customSections || resultResume.customSections.length === 0) {
            resultResume.customSections = original.customSections && original.customSections.length > 0
                ? original.customSections
                : [];
        }

        return resultResume;
    } catch (error) {
        console.warn("Could not restore original sections", error);
        return resultResume;
    }
}

export async function generateTailoredResume(
    resumeData: string,
    jobDescription: string,
    settings: AISettings
): Promise<TailoredResumeResult> {
    const prompt = `You are an elite resume strategist. Given the resume data and job description below, produce a surgically optimized resume AND a structured alignment analysis.

RETURN a JSON object with this EXACT schema:
{
  "companyName": "string — extract from JD",
  "companyShortName": "string — smart 3-letter uppercase abbreviation or stock ticker for the company",
  "jobTitle": "string — extract the exact job title from the JD",
  "alignmentScore": number (0-100),
  "alignmentDetails": {
    "matchingPoints": ["4-6 specific strengths where the resume directly matches JD requirements — cite the evidence"],
    "missingPoints": ["2-5 honest gaps or stretch areas — be specific about what's missing and suggest how to address it"]
  },
  "proofMap": [
    {
      "requirement": "specific job requirement extracted from the JD",
      "evidence": "best supporting evidence from the resume, or a clear explanation of the gap",
      "sourceSection": "Summary | Experience | Skills | Projects | Education | Certifications | Custom Section",
      "strength": "strong | moderate | gap",
      "reasoning": "1-2 sentence explanation — for 'strong', explain why it's a direct match; for 'moderate', what's partially covered; for 'gap', what transferable skills exist"
    }
  ],
  "changes": ["string — each change should explain WHAT was changed, WHERE, and WHY it improves alignment"],
  "resume": {
    "fullName": "string",
    "title": "string — optimized to mirror JD language while staying truthful",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "github": "string",
    "portfolio": "string",
    "location": "string",
    "summary": "string — rewritten to front-load the JD's top 3 requirements using the candidate's actual evidence",
    "education": [
      {
        "degree": "string",
        "institution": "string",
        "year": "string",
        "details": "string"
      }
    ],
    "customSections": [
      {
        "title": "string",
        "items": ["string"]
      }
    ],
    "experiences": [{"jobTitle": "string", "company": "string", "duration": "string", "duties": ["string"]}],
    "skills": {"category": "comma-separated values — use the same skill categories from the input, reorder to put JD-relevant skills first within each category"},
    "projects": [{"title": "string", "description": "string", "url": "string"}],
    "certifications": ["Cert Name | Issuer · Date"]
  }
}

OPTIMIZATION STRATEGY (follow this order):

STEP 1 — KEYWORD EXTRACTION
Identify the top 10-15 keywords and phrases from the JD (technical skills, tools, methodologies, domain terms). These are your target keywords.

STEP 2 — SUMMARY REWRITE
Rewrite the summary to naturally include the top 5 target keywords. Structure: "[X] years of experience in [domain] with expertise in [top 3 JD skills]. Proven track record of [strongest matching achievement]. [Career direction aligned with JD]."

STEP 3 — BULLET OPTIMIZATION
For each experience entry:
• Reorder bullets so the most JD-relevant ones come first.
• Rewrite each bullet in STAR-lite format: strong action verb → what was done → measurable result or concrete outcome.
• Front-load target keywords — place the most relevant JD term within the first 3 words of each bullet when natural.
• Vary action verbs — never repeat the same verb in consecutive bullets.
• Keep existing metrics. If a bullet has a number or percentage, preserve it and make it more prominent.

STEP 4 — SKILLS ALIGNMENT
Reorder skills within each category so JD-matching skills appear first. Do not remove existing skills — only reorder. If the resume has skills that match JD terms but use different names, add the JD-exact synonym in parentheses (e.g., "JavaScript (JS)").

STEP 5 — GAP ANALYSIS
For each JD requirement not directly supported by the resume:
• Check for transferable skills or adjacent experience.
• Capture it in "missingPoints" with an honest assessment.
• Do NOT fabricate experience to fill the gap in the resume output.

ALIGNMENT SCORE RUBRIC (weight each dimension, then compute a weighted average):
• Skills Match (30%): What % of required technical skills are present?
• Experience Depth (25%): Does the candidate have relevant role-level experience for the responsibilities described?
• Domain Fit (20%): Is the candidate's industry or problem-domain experience aligned?
• Seniority Alignment (15%): Does the candidate's experience level match the JD's expectations (junior/mid/senior)?
• Credential Coverage (10%): Are required/preferred degrees, certifications, or clearances present?

Score bands:
• 90-100: Exceptional match — candidate meets virtually all requirements with strong evidence
• 75-89: Strong match — most requirements met, 1-2 minor gaps
• 55-74: Moderate match — solid transferable skills but notable gaps in key areas
• Below 55: Stretch candidate — significant gaps but some relevant foundation

CRITICAL RULES:
1. PRESERVE Education and Custom Sections exactly as provided. DO NOT drop, merge, or summarize them.
2. PRESERVE all project URLs exactly as provided. Never embed URLs in description text.
3. NEVER invent metrics, tools, responsibilities, employers, dates, or credentials.
4. NEVER inflate seniority — if the candidate led 3 people, don't say "large-scale team."
5. DEDUPLICATION: Each item in exactly one place. Certifications in "certifications" only, not also in "customSections".
6. The "changes" array should list 4-6 specific, high-value edits with clear before→after reasoning.
7. The "proofMap" should contain 6-10 of the most critical JD requirements mapped to evidence or gaps.

INPUTS:

Resume Data:
${resumeData}

Job Description:
${jobDescription}

Return ONLY the JSON object, nothing else.`;

    const response = await callAI(prompt, settings);
    const jsonStr = extractJSON(response);

    try {
        const result = parseJSONResponse<{
            resume: ResumeData;
            changes?: string[];
            companyName?: string;
            companyShortName?: string;
            jobTitle?: string;
            alignmentScore?: number;
            alignmentDetails?: TailoredResumeResult['alignmentDetails'];
            proofMap?: unknown;
        }>(response);
        const restoredResume = restorePreservedSections(result.resume, resumeData);

        return {
            resume: restoredResume,
            changes: result.changes || [],
            companyName: result.companyName || 'Unknown Company',
            companyShortName: result.companyShortName,
            jobTitle: result.jobTitle || 'Position',
            alignmentScore: result.alignmentScore || 0,
            alignmentDetails: result.alignmentDetails || { matchingPoints: [], missingPoints: [] },
            proofMap: normalizeProofMap(result.proofMap),
        };
    } catch {
        console.error('Failed to parse JSON:', jsonStr);
        throw new Error('Failed to parse AI response as JSON. Please try again.');
    }
}

export async function generateCV(
    resumeData: string,
    jobDescription: string,
    settings: AISettings
): Promise<GeneratedCVResult> {
    const prompt = `You are an expert CV writer who understands the difference between a resume and a CV. A CV is a comprehensive academic and professional document — fuller, more narrative, and richer in context than a one-page resume.

TASK: Transform the source resume into a detailed CV. Return a JSON object with this EXACT schema:
{
  "companyName": "string — extract from JD if available, otherwise 'General'",
  "companyShortName": "string — smart 3-letter uppercase abbreviation. Use 'GEN' if no company",
  "jobTitle": "string — extract from JD if available, otherwise 'Professional Profile'",
  "proofMap": [
    {
      "requirement": "specific job requirement or professional theme",
      "evidence": "best supporting evidence from the source resume, or explain the gap",
      "sourceSection": "Summary | Experience | Skills | Projects | Education | Certifications | Custom Section",
      "strength": "strong | moderate | gap",
      "reasoning": "1-2 sentence explanation of match quality"
    }
  ],
  "changes": ["string — each change should describe WHAT was expanded, HOW, and WHY it adds value"],
  "cv": {
    "fullName": "string",
    "title": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string",
    "github": "string",
    "portfolio": "string",
    "location": "string",
    "summary": "string — a 4-6 sentence professional profile. Cover: domain expertise, years of experience, technical breadth, key achievements, and professional philosophy or career direction.",
    "education": [
      {
        "degree": "string",
        "institution": "string",
        "year": "string",
        "details": "string — expand with relevant coursework, honors, thesis topics, GPA if strong"
      }
    ],
    "customSections": [
      {
        "title": "string",
        "items": ["string"]
      }
    ],
    "experiences": [{"jobTitle": "string", "company": "string", "duration": "string", "duties": ["string"]}],
    "skills": {"category": "comma-separated values — use domain-appropriate categories from the source data"},
    "projects": [{"title": "string", "description": "string — expand to 2-3 sentences covering purpose, approach, and outcome", "url": "string"}],
    "certifications": ["Cert Name | Issuer · Date"]
  }
}

CV EXPANSION STRATEGY:

1. PROFESSIONAL PROFILE (summary): Expand from a brief summary to a 4-6 sentence narrative. Include the candidate's professional identity, domain expertise, technical depth, most impactful achievements, and career trajectory. This should read like the opening of a strong LinkedIn About section.

2. EXPERIENCE BULLETS: Expand each bullet to include:
   • Context — why was this work important? What problem was being solved?
   • Methodology — what approach, technology, or framework was used?
   • Impact — what was the measurable outcome or observable result?
   Keep the STAR-lite format but allow each bullet to be 1.5-2x longer than a resume bullet.

3. PROJECT DESCRIPTIONS: Expand from one-liners to 2-3 sentence descriptions covering the problem, approach, and result. Mention technologies used if they appear in the source data.

4. EDUCATION: Add relevant coursework, thesis/capstone topics, honors, or extracurriculars if mentioned anywhere in the source data.

5. CUSTOM SECTIONS: Preserve and expand. If the source has Awards, Publications, Volunteering, or similar sections, keep them and add detail where the source data supports it.

CRITICAL RULES:
1. NEVER invent facts — no fabricated metrics, employers, dates, tools, publications, or achievements. Every expansion must be grounded in the source data.
2. Preserve ALL sections from the source. A CV should be more comprehensive, not less.
3. Keep project URLs exactly as provided.
4. DEDUPLICATION: Each item in exactly one section.
5. If a JD is provided, weight the expansion toward JD-relevant experience, but do not omit non-relevant sections.
6. The "proofMap" array should contain 5-8 important themes mapped to evidence or gaps.
7. Return ONLY valid JSON.

INPUTS:

Resume Data:
${resumeData}

Job Description:
${jobDescription || 'No job description provided. Create a strong general-purpose CV that showcases the full breadth of the candidate\'s experience.'}

Return ONLY the JSON object, nothing else.`;

    const response = await callAI(prompt, settings);
    const jsonStr = extractJSON(response);

    try {
        const result = parseJSONResponse<{
            cv: ResumeData;
            changes?: string[];
            companyName?: string;
            companyShortName?: string;
            jobTitle?: string;
            proofMap?: unknown;
        }>(response);
        const restoredCv = restorePreservedSections(result.cv, resumeData);

        return {
            cv: restoredCv,
            changes: result.changes || [],
            companyName: result.companyName || 'General',
            companyShortName: result.companyShortName,
            jobTitle: result.jobTitle || 'Professional Profile',
            proofMap: normalizeProofMap(result.proofMap),
        };
    } catch {
        console.error('Failed to parse CV JSON:', jsonStr);
        throw new Error('Failed to generate CV. Please try again.');
    }
}

export async function generateCoverLetter(
    resumeData: string,
    jobDescription: string,
    settings: AISettings
): Promise<GeneratedCoverLetterResult> {
    const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
    });

    const prompt = `You are a persuasive cover letter writer who crafts letters that get interviews. You write like a professional storyteller — every paragraph has a purpose, every sentence earns its place.

TASK: Create a compelling, one-page cover letter. Return a JSON object with this EXACT schema:
{
  "companyName": "string — extract from JD if available, otherwise 'Company'",
  "companyShortName": "string — smart 3-letter uppercase abbreviation. Use 'GEN' if no company",
  "jobTitle": "string — extract from JD if available, otherwise 'Target Role'",
  "proofMap": [
    {
      "requirement": "specific job requirement or theme from the JD",
      "evidence": "best supporting evidence from the source resume, or explain the gap",
      "sourceSection": "Summary | Experience | Skills | Projects | Education | Certifications | Custom Section",
      "strength": "strong | moderate | gap",
      "reasoning": "1-2 sentence explanation of match quality"
    }
  ],
  "changes": ["string — describe each key angle or strategy used in the letter"],
  "coverLetter": {
    "fullName": "string",
    "title": "string",
    "email": "string",
    "phone": "string",
    "linkedin": "string (URL if available, else empty string)",
    "portfolio": "string (URL if available, else empty string)",
    "location": "string",
    "date": "${today}",
    "recipientName": "string — use 'Hiring Manager' if name not provided",
    "recipientTitle": "string — use hiring team or department if available, else company name",
    "companyName": "string",
    "companyLocation": "string (if unavailable, empty string)",
    "subject": "string — professional subject line that names the role",
    "greeting": "string",
    "opening": "string — the HOOK paragraph (see narrative arc below)",
    "body": ["string — EVIDENCE paragraph", "string — FIT paragraph", "string — optional DEPTH paragraph"],
    "closing": "string — the ASK paragraph (see narrative arc below)",
    "signoff": "string",
    "signatureName": "string"
  }
}

NARRATIVE ARC — Every great cover letter follows this structure:

1. HOOK (opening): Open with a specific, attention-grabbing statement that connects the candidate to the role. Reference the company by name and the specific position. Avoid generic openers like "I am writing to apply for..." — instead, lead with a compelling insight, a shared value, or the candidate's most relevant achievement. Example: "When I saw [Company]'s posting for [Role], I recognized the exact intersection of [skill] and [domain] that I've spent the past [X] years building."

2. EVIDENCE (body paragraph 1): Present the 2-3 strongest proof points from the resume that directly map to the JD's top requirements. Use specific numbers, project names, and outcomes. This paragraph answers: "Why should they believe I can do this job?"

3. FIT (body paragraph 2): Explain why THIS company, not just any company. Reference specific details from the JD — team structure, mission, tech stack, product, or values. Connect the candidate's trajectory to the company's direction. This paragraph answers: "Why do I want THIS role at THIS company?"

4. DEPTH (body paragraph 3, optional): If the candidate has a unique angle — an unusual background, a passion project, domain expertise, or a recent achievement — this is where it goes. Only include if it adds genuine value.

5. ASK (closing): Confident, forward-looking close. Express enthusiasm for discussing the role further. Mention availability. End with energy, not passivity.

TONE & STYLE:
• Conversational but professional — write like a confident peer, not a supplicant.
• Active voice throughout. No passive constructions.
• Specific over generic — "reduced data pipeline latency by 40%" beats "improved system performance."
• Avoid clichés: "passionate," "team player," "go-getter," "hard-working" — replace with evidence.
• Each paragraph should be 3-5 sentences. The full letter should be readable in under 60 seconds.

CRITICAL RULES:
1. NEVER invent facts — all claims must come from the source resume data.
2. Do NOT format as a resume or use bullet lists. This is a flowing letter.
3. The "body" array should contain 2-3 paragraphs (Evidence, Fit, and optionally Depth).
4. If the JD mentions a requirement the candidate lacks, acknowledge adjacent skills or transferable experience honestly — never pretend direct experience exists.
5. The "proofMap" should contain 4-7 key JD requirements mapped to evidence or gaps.
6. Return ONLY valid JSON.

INPUTS:

Resume Data:
${resumeData}

Job Description:
${jobDescription || 'No job description provided. Create a strong general-purpose cover letter that highlights the candidate\'s best qualities.'}

Return ONLY the JSON object, nothing else.`;

    const response = await callAI(prompt, settings);
    const jsonStr = extractJSON(response);

    try {
        const result = parseJSONResponse<{
            companyName?: string;
            companyShortName?: string;
            jobTitle?: string;
            proofMap?: unknown;
            changes?: string[];
            coverLetter?: Partial<CoverLetterData>;
        }>(response);
        const rawCoverLetter = result.coverLetter ?? {};

        const coverLetter: CoverLetterData = {
            fullName: typeof rawCoverLetter.fullName === 'string' ? rawCoverLetter.fullName : '',
            title: typeof rawCoverLetter.title === 'string' ? rawCoverLetter.title : '',
            email: typeof rawCoverLetter.email === 'string' ? rawCoverLetter.email : '',
            phone: typeof rawCoverLetter.phone === 'string' ? rawCoverLetter.phone : '',
            linkedin: typeof rawCoverLetter.linkedin === 'string' ? rawCoverLetter.linkedin : '',
            portfolio: typeof rawCoverLetter.portfolio === 'string' ? rawCoverLetter.portfolio : '',
            location: typeof rawCoverLetter.location === 'string' ? rawCoverLetter.location : '',
            date: typeof rawCoverLetter.date === 'string' && rawCoverLetter.date.trim() ? rawCoverLetter.date : today,
            recipientName: typeof rawCoverLetter.recipientName === 'string' && rawCoverLetter.recipientName.trim()
                ? rawCoverLetter.recipientName
                : 'Hiring Manager',
            recipientTitle: typeof rawCoverLetter.recipientTitle === 'string' && rawCoverLetter.recipientTitle.trim()
                ? rawCoverLetter.recipientTitle
                : (typeof result.companyName === 'string' && result.companyName.trim() ? result.companyName : 'Hiring Team'),
            companyName: typeof rawCoverLetter.companyName === 'string' && rawCoverLetter.companyName.trim()
                ? rawCoverLetter.companyName
                : (typeof result.companyName === 'string' && result.companyName.trim() ? result.companyName : 'Company'),
            companyLocation: typeof rawCoverLetter.companyLocation === 'string' ? rawCoverLetter.companyLocation : '',
            subject: typeof rawCoverLetter.subject === 'string' && rawCoverLetter.subject.trim()
                ? rawCoverLetter.subject
                : `Application for ${typeof result.jobTitle === 'string' && result.jobTitle.trim() ? result.jobTitle : 'the role'}`,
            greeting: typeof rawCoverLetter.greeting === 'string' && rawCoverLetter.greeting.trim()
                ? rawCoverLetter.greeting
                : 'Dear Hiring Manager,',
            opening: typeof rawCoverLetter.opening === 'string' ? rawCoverLetter.opening : '',
            body: Array.isArray(rawCoverLetter.body)
                ? rawCoverLetter.body.filter((item: unknown): item is string => typeof item === 'string' && item.trim().length > 0)
                : [],
            closing: typeof rawCoverLetter.closing === 'string' ? rawCoverLetter.closing : '',
            signoff: typeof rawCoverLetter.signoff === 'string' && rawCoverLetter.signoff.trim()
                ? rawCoverLetter.signoff
                : 'Warm regards,',
            signatureName: typeof rawCoverLetter.signatureName === 'string' && rawCoverLetter.signatureName.trim()
                ? rawCoverLetter.signatureName
                : (typeof rawCoverLetter.fullName === 'string' ? rawCoverLetter.fullName : ''),
        };

        return {
            coverLetter,
            changes: Array.isArray(result.changes) ? result.changes : [],
            companyName: typeof result.companyName === 'string' && result.companyName.trim()
                ? result.companyName
                : coverLetter.companyName,
            companyShortName: result.companyShortName,
            jobTitle: typeof result.jobTitle === 'string' && result.jobTitle.trim()
                ? result.jobTitle
                : 'Target Role',
            proofMap: normalizeProofMap(result.proofMap),
        };
    } catch {
        console.error('Failed to parse cover letter JSON:', jsonStr);
        throw new Error('Failed to generate cover letter. Please try again.');
    }
}

export async function extractATSKeywords(
    jobDescription: string,
    settings: AISettings
): Promise<string[]> {
    const prompt = `You are an ATS (Applicant Tracking System) keyword specialist. Analyze the job description below and extract the 10-15 most critical keywords and phrases that an ATS would score a resume against.

EXTRACTION STRATEGY:
1. REQUIRED SKILLS FIRST: Identify skills explicitly listed as "required", "must-have", or mentioned in the core responsibilities. These are the highest priority.
2. PREFERRED/BONUS SKILLS: Skills listed as "preferred", "nice-to-have", or "bonus" come next.
3. EXACT PHRASING: Use the exact terminology from the JD — if it says "React.js" don't return "React". If it says "CI/CD pipelines" don't return just "CI/CD".
4. INCLUDE DOMAIN TERMS: Don't just extract tech skills. Include role-specific domain terms (e.g., "supply chain optimization", "financial modeling", "machine learning") that signal industry fit.
5. INCLUDE SOFT SKILL SIGNALS: If the JD emphasizes leadership, communication, or collaboration patterns (e.g., "cross-functional collaboration", "stakeholder management"), include 1-2 of the most prominent ones.
6. SKIP GENERIC FILLER: Don't include generic terms like "team player", "detail-oriented", or "self-starter" — focus on terms that differentiate candidates.

Return ONLY a JSON array of 10-15 strings, ordered from most critical to least critical. Use the exact phrasing from the JD.

Job Description:
${jobDescription}

Return format: ["keyword1", "keyword2", ...]`;

    const response = await callAI(prompt, settings);
    const jsonStr = extractJSON(response);

    try {
        const keywords = parseJSONResponse<string[]>(response);
        // Cap at 15 keywords to prevent keyword stuffing
        return Array.isArray(keywords) ? keywords.slice(0, 15) : [];
    } catch {
        console.error('Failed to parse keywords:', jsonStr);
        return [];
    }
}


