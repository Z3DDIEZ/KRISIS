import { GoogleGenerativeAI, SchemaType, GenerationConfig } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");
// Gemini 1.5 Flash is cost-effective and fast for this use case
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// Define strict schema for resume analysis results
// This ensures the AI always returns data we can programmatically use
const analysisSchema = {
    type: SchemaType.OBJECT,
    properties: {
        fitScore: {
            type: SchemaType.NUMBER,
            description: "Score from 0-100 indicating fit for the role. 0 is no fit, 100 is perfect match."
        },
        matchAnalysis: {
            type: SchemaType.STRING,
            description: "Detailed analysis of why the candidate fits or does not fit the job description."
        },
        missingKeywords: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "List of important hard and soft skills found in JD but missing from resume."
        },
        suggestedImprovements: {
            type: SchemaType.ARRAY,
            items: { type: SchemaType.STRING },
            description: "Actionable suggestions to improve the resume for this specific role."
        }
    },
    required: ["fitScore", "matchAnalysis", "missingKeywords", "suggestedImprovements"]
};

const generationConfig: GenerationConfig = {
    temperature: 0.7,
    responseMimeType: "application/json",
    responseSchema: analysisSchema
};

export class GeminiService {
    /**
     * Analyzes a resume against a job description using Gemini 1.5 Flash.
     * Enforces JSON structure via responseSchema.
     */
    static async analyzeResume(resumeText: string, jobDescription: string) {
        if (!process.env.GEMINI_API_KEY) {
            console.error("GEMINI_API_KEY is missing from environment variables.");
            throw new Error("Server configuration error: GEMINI_API_KEY not set.");
        }

        const prompt = `
        You are an expert HR Recruiter and Technical Hiring Manager.
        Your task is to analyze the provided RESUME against the JOB DESCRIPTION.
        
        STRICTLY FOLLOW THIS JSON SCHEMA FOR OUTPUT.
        
        JOB DESCRIPTION:
        ${jobDescription}

        RESUME TEXT:
        ${resumeText}
        `;

        try {
            const result = await model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig
            });

            const responseText = result.response.text();

            // Parse JSON to verify validity before returning
            return JSON.parse(responseText);
        } catch (error) {
            console.error("Gemini Analysis Error:", error);
            throw new Error("Failed to analyze resume with AI. Please try again later.");
        }
    }
}
