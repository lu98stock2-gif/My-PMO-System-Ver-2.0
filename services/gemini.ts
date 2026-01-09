
import { GoogleGenAI, Type } from "@google/genai";

/**
 * Standard Gemini service helper.
 * Creates a fresh instance for each request to ensure reliability and up-to-date configuration.
 */
export const getAiInstance = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// Interface for the structured response from the AI for estimations
export interface AIResponseEstimate {
  items: Array<{
    phase: string;
    taskName: string;
    estimatedHours: number;
    role?: string;
    rationale: string;
  }>;
  totalHours: number;
  risks: string;
  assumptions: string;
}

/**
 * Uses gemini-3-pro-preview to decompose requirements into a structured WBS.
 * Employs JSON response mode with a defined schema for reliability.
 */
export const generateEstimate = async (inputText: string, projectType: string): Promise<AIResponseEstimate> => {
  const ai = getAiInstance();
  const prompt = `Decompose the following requirements for a ${projectType} project into a detailed Work Breakdown Structure (WBS). 
  Requirements: ${inputText}`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { type: Type.STRING },
                taskName: { type: Type.STRING },
                estimatedHours: { type: Type.NUMBER },
                role: { type: Type.STRING },
                rationale: { type: Type.STRING },
              },
              required: ['phase', 'taskName', 'estimatedHours', 'rationale'],
            },
          },
          totalHours: { type: Type.NUMBER },
          risks: { type: Type.STRING },
          assumptions: { type: Type.STRING },
        },
        required: ['items', 'totalHours', 'risks', 'assumptions'],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("Empty response from AI");
  return JSON.parse(text.trim());
};

/**
 * Uses gemini-3-flash-preview to synthesize monthly stats and notes into a report.
 * Returns a tagged text format for easy parsing by the frontend.
 */
export const generateMonthlyReport = async (
  selectedMonth: string,
  statsJson: string,
  dailyNotes: string,
  language: string
): Promise<string> => {
  const ai = getAiInstance();
  const prompt = `Generate a professional monthly project management report for ${selectedMonth} in ${language}.
  
  Statistics:
  ${statsJson}
  
  Daily Progress Notes:
  ${dailyNotes}
  
  Format requirements:
  Provide the output exactly as follows with the bracketed tags:
  [SUMMARY]
  (Summarize the primary achievements and status)
  [INSIGHTS]
  (Analyze productivity trends, blockers, and resource allocation)
  [NEXT ACTIONS]
  (List strategic steps for the upcoming month)`;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });

  return response.text || "";
};
