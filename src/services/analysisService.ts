import type { ResumeData, AISettings } from '../types';
import { callAI, extractJSON } from './aiService';

export interface ResumeAnalysis {
    score: number;
    summary: string;
    strengths: string[];
    weaknesses: string[];
    improvements: string[];
}

export async function analyzeResume(
    resumeData: ResumeData,
    jobDescription: string,
    settings: AISettings
): Promise<ResumeAnalysis> {
    const prompt = `Analyze this resume against the provided job description (if any) or general best practices.
  
  Resume:
  ${JSON.stringify(resumeData)}
  
  Job Description:
  ${jobDescription || "No specific JD provided - analyze for general professional quality."}
  
  Return a JSON object with:
  - score: number (0-100) based on relevance, formatting, and impact
  - summary: string (brief overview of the resume's quality)
  - strengths: array of strings (top 3 things done well)
  - weaknesses: array of strings (top 3 missing or weak areas)
  - improvements: array of strings (3 specific actionable tips)
  
  Return ONLY the JSON object.`;

    try {
        const response = await callAI(prompt, settings);
        const jsonStr = extractJSON(response);
        return JSON.parse(jsonStr);
    } catch (e) {
        console.error('Analysis failed:', e);
        // Return mock failure data to avoid crash
        return {
            score: 0,
            summary: "Analysis failed. Please try again.",
            strengths: [],
            weaknesses: [],
            improvements: []
        };
    }
}
