import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from '../types';

// Initialize Gemini Client
// Note: In a real environment, ensure process.env.API_KEY is set.
// If not set, this service handles the error gracefully.

// Safely retrieve API key, handling environments where process might not be defined
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore error if process is not accessible
  }
  return '';
};

const apiKey = getApiKey();
let ai: GoogleGenAI | null = null;

if (apiKey) {
  ai = new GoogleGenAI({ apiKey });
}

export const analyzeTitles = async (titles: string[]): Promise<AnalysisResult | null> => {
  if (!ai) {
    console.warn("Gemini API Key is missing.");
    return null;
  }

  if (titles.length === 0) return null;

  try {
    const prompt = `
      Analyze the following list of book source titles. 
      Provide a brief summary of the types of content available (e.g., "Mostly fantasy novels", "Mixed genres").
      Also provide a list of up to 5 relevant tags/categories.
      
      Titles:
      ${titles.slice(0, 50).join(", ")} ${(titles.length > 50 ? "...and more" : "")}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            tags: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["summary", "tags"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    return JSON.parse(text) as AnalysisResult;

  } catch (error) {
    console.error("Gemini Analysis Failed:", error);
    return null;
  }
};