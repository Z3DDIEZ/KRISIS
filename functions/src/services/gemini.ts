import { GoogleGenAI } from "@google/genai";

// Use environment variable for model ID, defaulting to reliable flash model
const MODEL_ID = process.env.GEMINI_MODEL_ID || "gemini-2.5-flash";

// JSON Schema for resume analysis results (Standard JSON Schema format)
const analysisSchema = {
  type: "object",
  properties: {
    fitScore: {
      type: "number",
      description: "Score from 0-100 indicating fit for the role.",
    },
    matchAnalysis: {
      type: "string",
      description: "Detailed analysis of alignment.",
    },
    missingKeywords: {
      type: "array",
      items: { type: "string" },
      description: "Skills missing from resume.",
    },
    suggestedImprovements: {
      type: "array",
      items: { type: "string" },
      description: "Actionable suggestions.",
    },
    ghostingRisk: {
      type: "number",
      description:
        "Score from 0-100 indicating risk of no response based on role trends and alignment.",
    },
    tacticalSignal: {
      type: "string",
      description:
        "One-sentence high-level tactical advice for this specific application.",
    },
    urgencyLevel: {
      type: "number",
      description: "Urgency from 1 to 5 for taking next steps.",
    },
  },
  required: [
    "fitScore",
    "matchAnalysis",
    "missingKeywords",
    "suggestedImprovements",
    "ghostingRisk",
    "tacticalSignal",
    "urgencyLevel",
  ],
};

export class GeminiService {
  /**
   * Cleans Gemini response text to extract raw JSON if it's wrapped in markdown fences.
   */
  private static cleanJsonResponse(text: string): string {
    // Match code blocks like ```json ... ``` or just ``` ... ```
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    return jsonMatch ? jsonMatch[1].trim() : text.trim();
  }

  /**
   * Analyzes a resume against a job description using the configured Gemini model.
   */
  static async analyzeResume(resumeText: string, jobDescription: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }

    // Initialize the SDK lazily (inside the function) to avoid deployment errors
    // when env vars might not be set in the global scope during analysis.
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    const prompt = `
        You are an ELITE STRATEGIC RECRUITMENT INTELLIGENCE OFFICER.
        Analyze the provided data with TACTICAL PRECISION.

        GOAL: Provide a cold, objective assessment of alignment and hidden risks.

        CONTEXT:
        JOB DESCRIPTION:
        ${jobDescription}

        RESUME TEXT:
        ${resumeText}

        INSTRUCTIONS:
        - Assess 'fitScore' based on hard requirements.
        - Assess 'ghostingRisk' by evaluating the company profile vs resume seniority (e.g., overqualified = high risk).
        - Provided 'tacticalSignal' must be a direct, high-fidelity instruction.
        - Do not use corporate fluff. Be clinical.
        `;

    try {
      const result = await ai.models.generateContent({
        model: MODEL_ID,
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        config: {
          temperature: 0.4,
          responseMimeType: "application/json",
          responseSchema: analysisSchema,
        },
      });

      // Access text property directly (it's a getter/property, not a function in new SDK)
      const responseText = result.text;

      if (!responseText) {
        throw new Error("Empty response from AI model");
      }

      // Log for diagnostics in Firebase Console
      console.log(`Raw Gemini Output (${MODEL_ID}):`, responseText);

      const cleanedJson = this.cleanJsonResponse(responseText);
      return JSON.parse(cleanedJson);
    } catch (error: any) {
      console.error("Gemini Analysis Execution Error:", {
        message: error.message,
        stack: error.stack,
        model: MODEL_ID,
        details: JSON.stringify(error),
      });
      throw new Error(`Intelligence Protocol Failure: ${error.message}`);
    }
  }

  // Helper to expose the current model ID being used
  static getCurrentModelId(): string {
    return MODEL_ID;
  }
}
