
import { CallableRequest, HttpsError } from "firebase-functions/v2/https";

/**
 * Validates that the user is authenticated.
 * Returns the uid if authenticated, otherwise throws HttpsError.
 */
export const assertAuthenticated = (request: CallableRequest): string => {
    if (!request.auth || !request.auth.uid) {
        throw new HttpsError(
            "unauthenticated",
            "You must be logged in to access this resource."
        );
    }
    return request.auth.uid;
};

/**
 * Interface for Quota Validation result
 */
export interface QuotaCheckResult {
    allowed: boolean;
    remaining: number;
}
