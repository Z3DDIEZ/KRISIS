import * as logger from "firebase-functions/logger";

const RAPIDAPI_HOST = "jsearch.p.rapidapi.com";
const RAPIDAPI_BASE_URL = `https://${RAPIDAPI_HOST}`;

export interface JobSearchQuery {
    query: string;
    page?: number;
    num_pages?: number;
    date_posted?: 'all' | 'today' | '3days' | 'week' | 'month';
    remote_jobs_only?: boolean;
}

export class JSearchService {
    static async search(params: JobSearchQuery) {
        const apiKey = process.env.RAPIDAPI_KEY;
        if (!apiKey) {
            logger.error("RAPIDAPI_KEY is missing");
            throw new Error("Server configuration error: RAPIDAPI_KEY not set.");
        }

        const url = new URL(`${RAPIDAPI_BASE_URL}/search`);
        url.searchParams.append("query", params.query);
        url.searchParams.append("page", (params.page || 1).toString());
        url.searchParams.append("num_pages", (params.num_pages || 1).toString());
        if (params.date_posted) url.searchParams.append("date_posted", params.date_posted);
        if (params.remote_jobs_only) url.searchParams.append("remote_jobs_only", "true");

        try {
            const response = await fetch(url.toString(), {
                method: "GET",
                headers: {
                    "X-RapidAPI-Key": apiKey,
                    "X-RapidAPI-Host": RAPIDAPI_HOST,
                },
            });

            if (!response.ok) {
                const errorText = await response.text();
                logger.error("JSearch API Error", { status: response.status, body: errorText });
                throw new Error(`JSearch API failed: ${response.statusText}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            logger.error("JSearch Request Failed", error);
            throw error;
        }
    }
}
