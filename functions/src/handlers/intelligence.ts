import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { assertAuthenticated } from "../middleware/auth";

const db = admin.firestore();

interface DetailedApplication {
  id: string;
  company: string;
  role: string;
  status: string;
  dateApplied: string;
  lastUpdated?: any; // Firestore Timestamp
  fitScore?: number;
  ghostingRisk?: number;
  urgencyLevel?: number;
}

interface TacticalItem {
  applicationId: string;
  company: string;
  role: string;
  action: string;
  urgency: 1 | 2 | 3 | 4 | 5;
  riskLevel: "low" | "medium" | "high" | "critical";
  daysSinceActivity: number;
}

export const generateDailyTacticalBrief = onCall(
  {
    region: "africa-south1",
    maxInstances: 10,
    cors: true,
  },
  async (request) => {
    const userId = assertAuthenticated(request);

    try {
      const applicationsRef = db.collection(`users/${userId}/applications`);
      // Get active applications only
      const snapshot = await applicationsRef
        .where("status", "in", ["Applied", "Interview", "Screening", "Offer"])
        .get();

      const tacticalItems: TacticalItem[] = [];
      const today = new Date();

      snapshot.forEach((doc) => {
        const data = doc.data() as DetailedApplication;
        const appliedDate = new Date(data.dateApplied);
        // Calculate days since applied or last update
        // Fallback to appliedDate if lastUpdated is missing
        const lastActivityDate = data.lastUpdated
          ? data.lastUpdated.toDate()
          : appliedDate;
        const daysSinceActivity = Math.floor(
          (today.getTime() - lastActivityDate.getTime()) / (1000 * 3600 * 24),
        );

        let urgency: 1 | 2 | 3 | 4 | 5 = 1;
        let action = "Monitor status";
        let riskLevel: "low" | "medium" | "high" | "critical" = "low";

        // --- BEHAVIORAL INTELLIGENCE LOGIC ---

        // 1. Ghosting Risk Analysis (Applied but ignored)
        if (data.status === "Applied") {
          if (daysSinceActivity > 14) {
            riskLevel = "high";
            urgency = 2; // Low urgency because it's likely dead, but needs a decision
            action = "Consider archiving - likely ghosted";
          } else if (daysSinceActivity > 7) {
            riskLevel = "medium";
            urgency = 3;
            action = "Send follow-up email (1st touch)";
          }
        }

        // 2. Interview Momentum (High Value)
        if (data.status === "Interview" || data.status === "Screening") {
          urgency = 5; // Interviews are always top priority
          riskLevel = "low"; // Active engagement implies low ghosting risk... usually

          if (daysSinceActivity > 3) {
            // If silence after interview for 3 days
            riskLevel = "medium";
            action = "Send post-interview thank you / check-in";
          } else {
            action = "Prepare tactical prep notes";
          }
        }

        // 3. Offer Management
        if (data.status === "Offer") {
          urgency = 5;
          action = "Review terms and negotiate";
        }

        // 4. Dead App Cleanup
        if (daysSinceActivity > 30 && data.status === "Applied") {
          riskLevel = "critical";
          action = "Archive as 'Ghosted' to clean pipeline";
          urgency = 1;
        }

        // Integrate AI Signals if available
        if (data.urgencyLevel) {
          // Average the calculated urgency with AI urgency (if it exists)
          urgency = Math.ceil((urgency + data.urgencyLevel) / 2) as
            | 1
            | 2
            | 3
            | 4
            | 5;
        }

        tacticalItems.push({
          applicationId: doc.id,
          company: data.company,
          role: data.role,
          action,
          urgency,
          riskLevel,
          daysSinceActivity,
        });
      });

      // Sort by Urgency (Desc) then Risk (Desc)
      tacticalItems.sort((a, b) => {
        if (b.urgency !== a.urgency) return b.urgency - a.urgency;
        return b.daysSinceActivity - a.daysSinceActivity; // Older stuff first within same urgency
      });

      return {
        date: today.toISOString(),
        items: tacticalItems,
        totalActive: tacticalItems.length,
      };
    } catch (error: any) {
      logger.error("Tactical Brief Generation Failed", { userId, error });
      throw new HttpsError("internal", "Failed to generate tactical brief.");
    }
  },
);
