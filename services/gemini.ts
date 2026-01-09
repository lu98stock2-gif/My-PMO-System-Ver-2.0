
import { GoogleGenAI, Type } from "@google/genai";

// Interface for structured WBS generation response
export interface AIResponseEstimate {
  items: {
    phase: string;
    taskName: string;
    estimatedHours: number;
    role: string;
    rationale: string;
  }[];
  totalHours: number;
  risks: string;
  assumptions: string;
}

// Initializing the AI client once for the service
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Standard Gemini service for potential future general purpose AI tasks
export const getAiInstance = () => {
  return ai;
};

// Function to generate a detailed project estimate WBS
export const generateEstimate = async (inputText: string, projectType: string): Promise<AIResponseEstimate> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `You are an expert project manager. Generate a detailed Work Breakdown Structure (WBS) for the following project type: ${projectType}. 
    Analyze these requirements and provide a hierarchical task list with effort estimates:
    ${inputText}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                phase: { type: Type.STRING, description: "Project phase (e.g., Discovery, Frontend, Backend)" },
                taskName: { type: Type.STRING, description: "Specific task name" },
                estimatedHours: { type: Type.NUMBER, description: "Effort in hours" },
                role: { type: Type.STRING, description: "Primary role needed (e.g., UI Designer, Senior Dev)" },
                rationale: { type: Type.STRING, description: "Brief explanation of why this task is needed and its complexity" },
              },
              required: ["phase", "taskName", "estimatedHours", "role", "rationale"],
            },
          },
          totalHours: { type: Type.NUMBER, description: "Sum of all estimated hours" },
          risks: { type: Type.STRING, description: "Potential bottlenecks or risks identified" },
          assumptions: { type: Type.STRING, description: "Assumptions made during estimation" },
        },
        required: ["items", "totalHours", "risks", "assumptions"],
      },
    },
  });

  const text = response.text || '{}';
  return JSON.parse(text);
};

// Function to generate a monthly performance report
export const generateMonthlyReport = async (month: string, stats: string, notes: string, language: string): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `Generate a professional Monthly Project Management Insights Report for ${month} in ${language}.
    Use the following operational data:
    Stats: ${stats}
    Daily Progress Notes: ${notes}
    
    The response MUST include the following tags to separate sections:
    [SUMMARY]
    (Overall status and key highlights)
    
    [INSIGHTS]
    (Analysis of efficiency, potential bottlenecks, and variance vs estimates)
    
    [NEXT ACTIONS]
    (Strategic recommendations for the upcoming period)
    
    Maintain a professional, data-driven, and proactive tone.`,
  });

  return response.text || '';
};