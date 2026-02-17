import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { assertAuthenticated } from "../middleware/auth";
import { JobScraperService } from "../services/scraper";

export const ingestJobUrl = onCall(
  {
    region: "africa-south1",
    maxInstances: 10,
    cors: true,
  },
  async (request) => {
    // 1. Authenticate
    const userId = assertAuthenticated(request);
    const { url } = request.data;

    if (!url) {
      throw new HttpsError(
        "invalid-argument",
        "URL is required for ingestion.",
      );
    }

    try {
      logger.info(`Starting Job Ingestion for user ${userId}`, { url });

      // 2. Call Scraper Service
      const jobData = await JobScraperService.ingestFromUrl(url);

      // 3. Return structured data to frontend (let user confirm/save)
      return {
        success: true,
        data: jobData,
      };
    } catch (error: any) {
      logger.error("Job Ingestion Failed", { userId, url, error });
      throw new HttpsError(
        "internal",
        error.message || "Failed to ingest job data.",
      );
    }
  },
);
