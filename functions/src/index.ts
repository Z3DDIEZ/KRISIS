import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { GeminiService } from "./services/gemini";
import { JSearchService } from "./services/jsearch";
import { assertAuthenticated } from "./middleware/auth";

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
    admin.initializeApp();
}

const db = admin.firestore();

export const analyzeResume = onCall({
    region: "africa-south1", // Consistent with firebase.json
    maxInstances: 10,
    cors: true,
}, async (request) => {
    // 1. Authentication Check
    const userId = assertAuthenticated(request);

    // Extract Input
    const { resumeText, jobDescription } = request.data;

    if (!resumeText || !jobDescription) {
        throw new HttpsError("invalid-argument", "Missing resumeText or jobDescription");
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const counterRef = db.doc(`users/${userId}/counters/dailyAnalysis`);

    // 2. Quota Enformcement (Transaction)
    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(counterRef);
            const data = doc.data() || { count: 0, date: today };

            // Reset if new day
            if (data.date !== today) {
                data.count = 0;
                data.date = today;
            }

            if (data.count >= 5) {
                throw new HttpsError("resource-exhausted", "Daily analysis quota exceeded (5/day).");
            }

            // Increment
            t.set(counterRef, { count: data.count + 1, date: today }, { merge: true });
        });
    } catch (error: any) {
        if (error.code === 'resource-exhausted') {
            throw error;
        }
        logger.error("Quota transaction failed", { userId, error });
        throw new HttpsError("internal", "Failed to verify quota.");
    }

    // 3. AI Analysis
    try {
        const analysis = await GeminiService.analyzeResume(resumeText, jobDescription);

        // 4. Save Results
        const resultRef = db.collection(`users/${userId}/analyses`).doc();
        await resultRef.set({
            ...analysis,
            jobDescriptionSnippet: jobDescription.substring(0, 200),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            model: "gemini-1.5-flash"
        });

        return { success: true, analysisId: resultRef.id, data: analysis };

    } catch (error) {
        logger.error("Analysis Failed", { userId, error });
        throw new HttpsError("internal", "AI Analysis failed to complete.");
    }
});

export const searchJobs = onCall({
    region: "africa-south1",
    maxInstances: 10,
    cors: true,
}, async (request) => {
    // 1. Auth Check
    const userId = assertAuthenticated(request);

    // 2. Rate Limit (Simple Daily Counter)
    const today = new Date().toISOString().split('T')[0];
    const counterRef = db.doc(`users/${userId}/counters/dailyJobSearch`);

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(counterRef);
            const data = doc.data() || { count: 0, date: today };

            if (data.date !== today) { data.count = 0; data.date = today; }

            if (data.count >= 20) {
                throw new HttpsError("resource-exhausted", "Daily job search quota exceeded (20/day).");
            }

            t.set(counterRef, { count: data.count + 1, date: today }, { merge: true });
        });
    } catch (error: any) {
        if (error.code === 'resource-exhausted') throw error;
        throw new HttpsError("internal", "Quota check failed.");
    }

    // 3. Perform Search
    try {
        const { query, page, date_posted, remote_jobs_only } = request.data;
        if (!query) throw new HttpsError("invalid-argument", "Query is required");

        const results = await JSearchService.search({
            query,
            page: page || 1,
            date_posted,
            remote_jobs_only
        });

        return results;
    } catch (error: any) {
        logger.error("Job Search Failed", { userId, error });
        throw new HttpsError("internal", "Job Search Reference Failed.");
    }
});
