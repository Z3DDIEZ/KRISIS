import {
  GoogleGenerativeAI,
  SchemaType,
  GenerationConfig,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// Gemini Pro (1.0) is the most widely available stable model
const model = genAI.getGenerativeModel({ model: "gemini-pro" });

// Define strict schema for resume analysis results
// This ensures the AI always returns data we can programmatically use
const analysisSchema = {
  type: SchemaType.OBJECT,
  properties: {
    fitScore: {
      type: SchemaType.NUMBER,
      description: "Score from 0-100 indicating fit for the role.",
    },
    matchAnalysis: {
      type: SchemaType.STRING,
      description: "Detailed analysis of alignment.",
    },
    missingKeywords: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Skills missing from resume.",
    },
    suggestedImprovements: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Actionable suggestions.",
    },
    ghostingRisk: {
      type: SchemaType.NUMBER,
      description:
        "Score from 0-100 indicating risk of no response based on role trends and alignment.",
    },
    tacticalSignal: {
      type: SchemaType.STRING,
      description:
        "One-sentence high-level tactical advice for this specific application.",
    },
    urgencyLevel: {
      type: SchemaType.NUMBER,
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

const generationConfig: GenerationConfig = {
  temperature: 0.4, // Lower temperature for more consistent structured data
  responseMimeType: "application/json",
  responseSchema: analysisSchema,
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
   * Analyzes a resume against a job description using Gemini Pro.
   */
  static async analyzeResume(resumeText: string, jobDescription: string) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("Missing GEMINI_API_KEY environment variable.");
    }

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
      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig,
      });

      const responseText = result.response.text();

      // Log for diagnostics in Firebase Console
      console.log("Raw Gemini Output:", responseText);

      const cleanedJson = this.cleanJsonResponse(responseText);
      return JSON.parse(cleanedJson);
    } catch (error: any) {
      console.error("Gemini Analysis Execution Error:", {
        message: error.message,
        stack: error.stack,
        details: error.response?.promptFeedback,
      });
      throw new Error(`Intelligence Protocol Failure: ${error.message}`);
    }
  }
}
