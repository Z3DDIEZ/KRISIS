import * as logger from "firebase-functions/logger";
import { JSearchService } from "./jsearch";

export class JobScraperService {
  /**
   * Extracts keywords from a job URL and uses JSearch to find the job details.
   * This avoids using a headless browser which is heavy and prone to blocking.
   */
  static async ingestFromUrl(url: string) {
    try {
      const keywords = this.extractKeywords(url);
      if (!keywords) {
        throw new Error("Could not extract meaningful keywords from URL.");
      }

      logger.info(`Ingesting URL via Search: ${keywords}`);

      // Search for the specific job
      const searchResults = await JSearchService.search({
        query: keywords,
        page: 1,
        num_pages: 1,
      });

      if (!searchResults.data || searchResults.data.length === 0) {
        throw new Error("No matching jobs found in intelligence database.");
      }

      // Return the top match (most likely the job itself)
      const bestMatch = searchResults.data[0];
      return {
        company: bestMatch.employer_name,
        role: bestMatch.job_title,
        description: bestMatch.job_description,
        apply_link: bestMatch.job_apply_link,
        location: bestMatch.job_city
          ? `${bestMatch.job_city}, ${bestMatch.job_country}`
          : bestMatch.job_country,
        logo: bestMatch.employer_logo,
        posted_at: bestMatch.job_posted_at_datetime_utc,
        inferred_from_url: true,
      };
    } catch (error: any) {
      logger.error("Scraper Ingestion Failed", { url, error });
      throw new Error(`Ingestion failed: ${error.message}`);
    }
  }

  private static extractKeywords(url: string): string | null {
    try {
      const urlObj = new URL(url);

      // LinkedIn: linkedin.com/jobs/view/senior-software-engineer-at-google-...
      if (urlObj.hostname.includes("linkedin")) {
        // Basic heuristic: grab first few words from slug if available
        // e.g. /jobs/view/12345 (no keywords) vs /jobs/view/software-engineer-google
        // If it's just an ID, this relies on user providing a descriptive URL or fails.

        // Better approach: Regex for slug
        const match = url.match(/linkedin\.com\/jobs\/view\/([^/?]+)/);
        if (match) {
          return match[1].replace(/-/g, " ").substring(0, 50); // Clean up
        }
      }

      // Indeed: indeed.com/viewjob?jk=... (No keywords usually)
      // But sometimes: indeed.com/q-Software-Engineer-jobs.html

      // Fallback: If we can't parse structure, try to infer from path
      const pathSegments = urlObj.pathname
        .split("/")
        .filter((s) => s.length > 3);
      if (pathSegments.length > 0) {
        const potentialSlug = pathSegments[pathSegments.length - 1];
        return potentialSlug.replace(/[-_]/g, " ").replace(/\.html?$/, "");
      }

      return null;
    } catch (e) {
      return null;
    }
  }
}
