import * as logger from "firebase-functions/logger";
import { JSearchService } from "./jsearch";

export class JobScraperService {
  /**
   * Extracts keywords from a job URL and uses JSearch to find the job details.
   * This avoids using a headless browser which is heavy and prone to blocking.
   */
  static async ingestFromUrl(url: string) {
    try {
      // enhanced strategy: try to get the page title first, fall back to URL slug
      const searchQuery = await this.getBestSearchQuery(url);

      if (!searchQuery) {
        throw new Error("Could not extract meaningful keywords from URL.");
      }

      logger.info(`Ingesting URL via Search: ${searchQuery}`);

      // Search for the specific job
      const searchResults = await JSearchService.search({
        query: searchQuery,
        page: 1,
        num_pages: 1,
      });

      if (!searchResults.data || searchResults.data.length === 0) {
        logger.warn(`No JSearch results for query: ${searchQuery}`, { url });

        // GRACEFUL FALLBACK: If the job is too new to be indexed,
        // return what we know from the URL/Title so the user can fill in the rest.
        return {
          company: "Unknown (New Listing)",
          role: searchQuery, // Best guess from title
          description: `Imported from URL: ${url}\n\nJob details not yet indexed in global database. Please copy/paste description manually.`,
          apply_link: url,
          location: "Remote/Unknown",
          logo: null,
          posted_at: new Date().toISOString(),
          inferred_from_url: true,
          fallback_used: true,
        };
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
      // LAST RESORT FALLBACK: If even the search fails (e.g. API limit), return basic URL data
      logger.error("Scraper Ingestion Failed", { url, error });

      // Try to extract *something* from the URL to be helpful
      const fallbackTitle = this.extractSlug(url) || "New Application";

      return {
        company: "Imported Job",
        role: fallbackTitle,
        description: `Imported from URL: ${url}\n\nAutomatic extraction failed.`,
        apply_link: url,
        location: "",
        logo: null,
        posted_at: new Date().toISOString(),
        inferred_from_url: true,
        error: error.message,
      };
    }
  }

  private static extractSlug(url: string): string | null {
    try {
      const urlObj = new URL(url);
      const pathSegments = urlObj.pathname
        .split("/")
        .filter((s) => s.length > 2);
      return pathSegments.length > 0
        ? pathSegments[pathSegments.length - 1].replace(/-/g, " ")
        : null;
    } catch {
      return null;
    }
  }

  private static async getBestSearchQuery(url: string): Promise<string | null> {
    try {
      // 1. Try to fetch the page title (most accurate)
      // Note: This might be blocked by some sites (LinkedIn), but works for many simple boards.
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      try {
        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          },
        });
        clearTimeout(timeoutId);

        if (response.ok) {
          const html = await response.text();
          const titleMatch = html.match(/<title>([^<]*)<\/title>/i);
          if (titleMatch && titleMatch[1]) {
            // Clean the title
            let title = titleMatch[1].trim();
            // Remove common suffixes
            title = title.replace(
              / \| LinkedIn| \| Indeed| \| Glassdoor| - Job.*$/i,
              "",
            );
            if (
              title.length > 5 &&
              !title.includes("Auth") &&
              !title.includes("Login")
            ) {
              return title;
            }
          }
        }
      } catch (e) {
        // Fetch failed (timeout or block), fall back to URL parsing
        logger.warn("HTML Title fetch failed, falling back to URL parsing", {
          url,
        });
      }

      // 2. Fallback: URL Parsing
      const urlObj = new URL(url);

      // LinkedIn: linkedin.com/jobs/view/senior-software-engineer...
      if (urlObj.hostname.includes("linkedin")) {
        const match = url.match(/linkedin\.com\/jobs\/view\/([^/?]+)/);
        if (match) {
          return match[1].replace(/-/g, " ").substring(0, 50);
        }
      }

      // Generic Path Fallback
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
