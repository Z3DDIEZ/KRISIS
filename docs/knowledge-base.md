**Core Idea**  
A SaaS platform that tracks applications and uses **Gemini** to:

- Score CV–job fit
- Summarize job descriptions
- Generate tailored cover-letter drafts
- Surface application analytics and trends
**Google Stack**
- **Frontend:** Firebase Hosting + Vite
- **Auth:** Firebase Authentication (OAuth, email)
- **Data:** Firestore (structured) + BigQuery (analytics)
- **Backend:** Cloud Functions (Node.js / TypeScript)
- **AI:** Gemini API (resume parsing, summarization)
- **Observability:** Cloud Logging + Error Reporting
**Signals to Employers**

- SaaS evolution
- AI integration beyond “toy chatbot”
- Analytics-driven architecture
  

---

# Google Cloud Platform Architecture

References JT_V2_GCP ARCHITECTURE.MD (see below)
## 🎯 Executive Summary

**Product**: AI-Augmented Job Application Intelligence Platform  
**Platform**: Google Cloud Platform (100% Google-native stack)  
**Architecture Pattern**: Serverless, Event-Driven, Multi-Tenant SaaS  
**Target Scale**: 1,000 users, 100,000 applications  
**Monthly Budget**: $50-100 (Free tier optimized)

---

## 📐 Architecture Overview

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│  Firebase Hosting (CDN)                                          │
│  ├─ React/TypeScript SPA                                        │
│  ├─ Tailwind CSS                                                │
│  └─ Firebase SDK (Auth + Firestore)                             │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ HTTPS/WSS
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    AUTHENTICATION LAYER                          │
├─────────────────────────────────────────────────────────────────┤
│  Firebase Authentication                                         │
│  ├─ Email/Password                                              │
│  ├─ Google OAuth                                                │
│  ├─ Session Management                                          │
│  └─ Identity Token Generation                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         │ Auth Token
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Cloud Functions (2nd Gen)        │  Cloud Run (Future)         │
│  ├─ AI Processing                 │  ├─ API Gateway             │
│  ├─ Analytics Jobs                │  └─ Background Workers      │
│  ├─ Notification Triggers         │                             │
│  └─ Data Exports                  │                             │
└────────────┬────────────────┬──────────────────────────────────┘
             │                │
             │                │
    ┌────────▼────────┐  ┌───▼──────────┐
    │  Gemini API     │  │  Pub/Sub     │
    │  (AI/ML)        │  │  (Events)    │
    └─────────────────┘  └──────────────┘
                         │
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                        DATA LAYER                                │
├─────────────────────────────────────────────────────────────────┤
│  Firestore (Primary)              │  BigQuery (Analytics)       │
│  ├─ User Profiles                 │  ├─ Application Events      │
│  ├─ Applications                  │  ├─ User Behavior           │
│  ├─ AI Analysis Results           │  ├─ Success Metrics         │
│  └─ Real-time Sync                │  └─ ML Training Data        │
│                                    │                             │
│  Cloud Storage                     │  Secret Manager             │
│  ├─ Resume Files                  │  ├─ API Keys                │
│  ├─ Exported Reports              │  └─ Service Credentials     │
│  └─ Static Assets                 │                             │
└─────────────────────────────────────────────────────────────────┘
                         │
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                    OBSERVABILITY LAYER                           │
├─────────────────────────────────────────────────────────────────┤
│  Cloud Logging  │  Cloud Monitoring  │  Error Reporting         │
│  ├─ Audit Logs  │  ├─ Metrics        │  ├─ Exception Tracking   │
│  └─ Debug Logs  │  └─ Alerts         │  └─ Stack Traces         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Component Architecture (Detailed)

### 1. Frontend Layer

#### **Technology Stack**
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (JIT compiler)
- **State Management**: TanStack Query + Zustand
- **Firebase SDK**: v10.x (Auth + Firestore)

#### **Hosting**
- **Service**: Firebase Hosting
- **CDN**: Global edge caching
- **SSL**: Automatic HTTPS
- **Deployment**: GitHub Actions → Firebase CLI

#### **Key Features**
```typescript
// Real-time Firestore subscription
const { data: applications } = useFirestoreCollection(
  collection(db, `users/${userId}/applications`),
  { 
    subscribe: true,
    transform: (doc) => ({ id: doc.id, ...doc.data() })
  }
);

// Optimistic updates
const { mutate: updateApplication } = useMutation({
  mutationFn: async (update) => {
    await updateDoc(doc(db, `users/${userId}/applications/${id}`), update);
  },
  onMutate: async (update) => {
    // Optimistic update
    queryClient.setQueryData(['applications'], old => 
      old.map(app => app.id === id ? { ...app, ...update } : app)
    );
  }
});
```

#### **Bundle Optimization**
```javascript
// vite.config.ts
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          'ui': ['react', 'react-dom'],
          'charts': ['recharts'],
          'utils': ['date-fns', 'lodash-es']
        }
      }
    }
  }
}
```

---

### 2. Authentication Layer

#### **Firebase Authentication Configuration**

```javascript
// Identity Platform Features
{
  "emailPasswordEnabled": true,
  "googleOAuthEnabled": true,
  "emailVerificationRequired": true,
  "passwordPolicy": {
    "minLength": 8,
    "requireUppercase": true,
    "requireLowercase": true,
    "requireNumbers": true
  },
  "sessionDuration": "14d",
  "mfa": {
    "enabled": false, // Future enhancement
    "methods": ["SMS", "TOTP"]
  }
}
```

#### **Security Rules**
```javascript
// Firestore Security Rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // User data isolation
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      // Applications subcollection
      match /applications/{applicationId} {
        allow read, write: if request.auth.uid == userId;
        
        // Validate data structure
        allow create: if request.resource.data.keys().hasAll([
          'company', 'role', 'status', 'dateApplied', 'visa'
        ]) && request.resource.data.company is string
           && request.resource.data.company.size() > 0
           && request.resource.data.company.size() <= 100;
      }
      
      // AI analysis results
      match /aiAnalysis/{analysisId} {
        allow read: if request.auth.uid == userId;
        allow write: if false; // Only Cloud Functions can write
      }
    }
  }
}
```

---

### 3. Application Layer

#### **Cloud Functions (2nd Gen)**

**A. AI Resume Analysis Function**

```typescript
// functions/src/aiAnalysis.ts
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const analyzeApplication = onDocumentCreated(
  {
    document: 'users/{userId}/applications/{applicationId}',
    region: 'us-central1',
    memory: '512MiB',
    timeoutSeconds: 60,
    maxInstances: 10
  },
  async (event) => {
    const { userId, applicationId } = event.params;
    const application = event.data?.data();
    
    if (!application) return;

    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Generate prompt
    const prompt = `
      Analyze this job application:
      Company: ${application.company}
      Role: ${application.role}
      Status: ${application.status}
      
      Provide:
      1. Resume-job fit score (0-100)
      2. Key matching skills (3-5)
      3. Gaps to address (2-3)
      4. Suggested next steps
      
      Format as JSON.
    `;

    try {
      const result = await model.generateContent(prompt);
      const analysis = JSON.parse(result.response.text());

      // Store analysis
      await admin.firestore()
        .doc(`users/${userId}/aiAnalysis/${applicationId}`)
        .set({
          ...analysis,
          analyzedAt: admin.firestore.FieldValue.serverTimestamp(),
          version: '1.0'
        });

      // Log event for analytics
      await logAnalyticsEvent(userId, 'ai_analysis_completed', {
        applicationId,
        fitScore: analysis.fitScore
      });

    } catch (error) {
      console.error('AI analysis failed:', error);
      await reportError(error, { userId, applicationId });
    }
  }
);
```

**B. Weekly Analytics Aggregation**

```typescript
// functions/src/analytics.ts
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const weeklyAnalytics = onSchedule(
  {
    schedule: '0 18 * * 0', // Sunday 6 PM
    timeZone: 'UTC',
    region: 'us-central1'
  },
  async (event) => {
    const db = admin.firestore();
    
    // Get all active users
    const usersSnapshot = await db.collection('users').get();
    
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      // Query last week's applications
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const appsSnapshot = await db
        .collection(`users/${userId}/applications`)
        .where('dateApplied', '>=', weekAgo.toISOString())
        .get();
      
      const applications = appsSnapshot.docs.map(d => d.data());
      
      // Calculate metrics
      const metrics = {
        totalApplications: applications.length,
        statusBreakdown: countByStatus(applications),
        successRate: calculateSuccessRate(applications),
        averageResponseTime: calculateAvgResponseTime(applications),
        topCompanies: getTopCompanies(applications, 5)
      };
      
      // Store weekly summary
      await db
        .doc(`users/${userId}/weeklyAnalytics/${getWeekId()}`)
        .set({
          ...metrics,
          weekStart: weekAgo,
          weekEnd: new Date(),
          generatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      
      // Send email summary (if enabled)
      if (userDoc.data().emailNotifications) {
        await sendWeeklySummaryEmail(userId, metrics);
      }
    }
  }
);
```

**C. Export to BigQuery Function**

```typescript
// functions/src/bigquery.ts
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { BigQuery } from '@google-cloud/bigquery';

export const exportToBigQuery = onDocumentWritten(
  {
    document: 'users/{userId}/applications/{applicationId}',
    region: 'us-central1'
  },
  async (event) => {
    const { userId, applicationId } = event.params;
    const before = event.data?.before.data();
    const after = event.data?.after.data();
    
    const bigquery = new BigQuery();
    const dataset = bigquery.dataset('job_tracker');
    const table = dataset.table('application_events');
    
    // Determine event type
    let eventType: string;
    if (!before && after) eventType = 'created';
    else if (before && !after) eventType = 'deleted';
    else if (before.status !== after.status) eventType = 'status_changed';
    else eventType = 'updated';
    
    // Stream insert
    await table.insert({
      event_id: `${userId}_${applicationId}_${Date.now()}`,
      user_id: userId,
      application_id: applicationId,
      event_type: eventType,
      event_timestamp: new Date().toISOString(),
      company: after?.company || before?.company,
      role: after?.role || before?.role,
      old_status: before?.status,
      new_status: after?.status,
      visa_sponsorship: after?.visa || before?.visa
    });
  }
);
```

#### **Cloud Run Services (Future)**

```yaml
# cloudrun-api.yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: job-tracker-api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/minScale: "0"
        autoscaling.knative.dev/maxScale: "10"
    spec:
      containers:
      - image: gcr.io/PROJECT_ID/job-tracker-api:latest
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: firestore-url
              key: url
        resources:
          limits:
            memory: 512Mi
            cpu: 1
```

---

### 4. Data Layer

#### **A. Firestore Database Design**

**Collections Structure**:
```
/users/{userId}
  ├─ email: string
  ├─ displayName: string
  ├─ createdAt: timestamp
  ├─ settings: {
  │    emailNotifications: boolean
  │    darkMode: boolean
  │    timezone: string
  │  }
  │
  ├─ /applications/{applicationId}
  │    ├─ company: string
  │    ├─ role: string
  │    ├─ status: string
  │    ├─ dateApplied: string (YYYY-MM-DD)
  │    ├─ visa: boolean
  │    ├─ notes: string
  │    ├─ resumeUrl: string (optional)
  │    ├─ createdAt: timestamp
  │    └─ updatedAt: timestamp
  │
  ├─ /aiAnalysis/{applicationId}
  │    ├─ fitScore: number (0-100)
  │    ├─ matchingSkills: string[]
  │    ├─ gaps: string[]
  │    ├─ suggestions: string[]
  │    └─ analyzedAt: timestamp
  │
  └─ /weeklyAnalytics/{weekId}
       ├─ totalApplications: number
       ├─ statusBreakdown: object
       ├─ successRate: number
       └─ generatedAt: timestamp
```

**Indexes**:
```javascript
// Firestore Indexes
[
  {
    collectionGroup: 'applications',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'dateApplied', order: 'DESCENDING' },
      { fieldPath: 'status', order: 'ASCENDING' }
    ]
  },
  {
    collectionGroup: 'applications',
    queryScope: 'COLLECTION',
    fields: [
      { fieldPath: 'company', order: 'ASCENDING' },
      { fieldPath: 'dateApplied', order: 'DESCENDING' }
    ]
  }
]
```

#### **B. BigQuery Schema**

```sql
-- application_events table
CREATE TABLE `job_tracker.application_events` (
  event_id STRING NOT NULL,
  user_id STRING NOT NULL,
  application_id STRING NOT NULL,
  event_type STRING NOT NULL, -- created, updated, status_changed, deleted
  event_timestamp TIMESTAMP NOT NULL,
  company STRING,
  role STRING,
  old_status STRING,
  new_status STRING,
  visa_sponsorship BOOLEAN,
  
  -- Partitioning for cost optimization
  _PARTITIONTIME TIMESTAMP
)
PARTITION BY DATE(event_timestamp)
CLUSTER BY user_id, company;

-- user_analytics table
CREATE TABLE `job_tracker.user_analytics` (
  user_id STRING NOT NULL,
  metric_date DATE NOT NULL,
  total_applications INT64,
  applications_this_week INT64,
  success_rate FLOAT64,
  avg_response_time_days FLOAT64,
  top_companies ARRAY<STRING>
)
PARTITION BY metric_date
CLUSTER BY user_id;
```

**Sample Analytical Queries**:
```sql
-- Success rate by company
SELECT 
  company,
  COUNT(*) as total_applications,
  COUNTIF(new_status = 'Offer') as offers,
  ROUND(COUNTIF(new_status = 'Offer') / COUNT(*) * 100, 2) as success_rate_pct
FROM `job_tracker.application_events`
WHERE event_type = 'status_changed'
  AND DATE(event_timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY company
HAVING total_applications >= 10
ORDER BY success_rate_pct DESC;

-- Application velocity trends
SELECT 
  DATE_TRUNC(event_timestamp, WEEK) as week,
  COUNT(DISTINCT application_id) as applications
FROM `job_tracker.application_events`
WHERE event_type = 'created'
  AND user_id = @userId
GROUP BY week
ORDER BY week DESC;
```

---

### 5. AI/ML Integration

#### **Gemini API Integration**

**Use Cases**:
1. **Resume-Job Fit Analysis** - Score matching (0-100)
2. **Cover Letter Generation** - Tailored drafts
3. **Interview Prep** - Question prediction
4. **Company Research** - Automated summaries

**Rate Limiting Strategy**:
```typescript
// Rate limiter for Gemini API calls
import { RateLimiterMemory } from 'rate-limiter-flexible';

const geminiRateLimiter = new RateLimiterMemory({
  points: 60, // 60 requests
  duration: 60, // per minute
  blockDuration: 60 // block for 1 minute if exceeded
});

async function callGeminiAPI(userId: string, prompt: string) {
  try {
    await geminiRateLimiter.consume(userId, 1);
    
    const result = await model.generateContent(prompt);
    return result.response.text();
    
  } catch (error) {
    if (error instanceof Error && error.message.includes('rate limit')) {
      throw new Error('Too many AI requests. Please try again in 1 minute.');
    }
    throw error;
  }
}
```

**Cost Optimization**:
- Cache common analysis results (Firestore)
- Batch similar requests
- Use streaming for long responses
- Set max tokens limit per request

---

### 6. Event-Driven Architecture

#### **Pub/Sub Topics**

```javascript
// Topic configurations
const topics = {
  'application-created': {
    subscribers: ['ai-analysis', 'bigquery-export', 'analytics-update']
  },
  'application-status-changed': {
    subscribers: ['notification-trigger', 'bigquery-export']
  },
  'weekly-report-scheduled': {
    subscribers: ['analytics-aggregation', 'email-sender']
  }
};
```

**Example: Status Change Event Flow**:
```
User updates status (Frontend)
  → Firestore write
  → Cloud Function triggered
  → Pub/Sub message published
  → Multiple subscribers process in parallel:
     - Send notification
     - Update BigQuery
     - Recalculate analytics
```

---

### 7. Observability & Monitoring

#### **Cloud Logging**

```typescript
// Structured logging
import { logger } from 'firebase-functions';

logger.info('Application created', {
  userId,
  applicationId,
  company: application.company,
  severity: 'INFO',
  labels: { component: 'ai-analysis' }
});

logger.error('Gemini API error', {
  userId,
  errorCode: error.code,
  errorMessage: error.message,
  severity: 'ERROR',
  labels: { component: 'ai-analysis', critical: 'true' }
});
```

#### **Cloud Monitoring Dashboards**

**Key Metrics**:
- Function execution time (p50, p95, p99)
- Gemini API success rate
- Firestore read/write operations
- BigQuery query costs
- User signup rate
- Application creation rate

**Alerts**:
```yaml
# alerting-policy.yaml
displayName: "High Error Rate"
conditions:
  - displayName: "Function errors > 5%"
    conditionThreshold:
      filter: 'resource.type="cloud_function" AND metric.type="cloudfunctions.googleapis.com/function/execution_count" AND metric.label.status!="ok"'
      comparison: COMPARISON_GT
      thresholdValue: 0.05
      duration: 300s
notificationChannels:
  - "projects/PROJECT_ID/notificationChannels/EMAIL_CHANNEL"
```

---

## 💰 Cost Estimation

### Monthly Cost Breakdown (1,000 users, 10,000 applications/month)

| Service | Usage | Cost |
|---------|-------|------|
| **Firebase Hosting** | 10GB bandwidth | Free tier |
| **Firebase Auth** | 1,000 active users | Free tier |
| **Firestore** | 50K reads, 20K writes | $0.06 + $0.18 = $0.24 |
| **Cloud Functions** | 100K invocations | Free tier (2M/month free) |
| **Gemini API** | 10K requests | ~$10 (estimate) |
| **BigQuery** | 100MB data, 1GB queries | Free tier |
| **Cloud Logging** | 5GB logs | Free tier (50GB/month free) |
| **Cloud Storage** | 1GB storage | Free tier |
| **Total** | | **~$10-15/month** |

**Optimization Strategies**:
- Use Firestore bundle for initial data load
- Cache Gemini responses (reduce API calls)
- Enable BigQuery flat-rate pricing if needed
- Compress Cloud Storage files
- Set retention policies on logs

---

## 🚀 Deployment Architecture

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          npm ci
          cd functions && npm ci
      
      - name: Build frontend
        run: npm run build
      
      - name: Build functions
        run: cd functions && npm run build
      
      - name: Run tests
        run: |
          npm test
          cd functions && npm test
      
      - name: Deploy to Firebase
        run: |
          npm install -g firebase-tools
          firebase deploy --token ${{ secrets.FIREBASE_TOKEN }}
```

### Environment Management

```
Development  → Firebase project: job-tracker-dev
Staging      → Firebase project: job-tracker-staging  
Production   → Firebase project: job-tracker-prod
```

---

## 🔐 Security Architecture

### Defense in Depth

1. **Frontend**: Firebase Auth SDK (session management)
2. **API**: Cloud Functions with auth context verification
3. **Database**: Firestore security rules (server-side validation)
4. **Network**: Firebase Hosting with automatic HTTPS
5. **Secrets**: Secret Manager (API keys, credentials)

### Data Privacy

- **GDPR Compliance**: User data export/delete functions
- **Data Encryption**: At-rest and in-transit (automatic)
- **Audit Logging**: Track all data access
- **Data Residency**: Multi-region Firestore (EU/US)

---

## 📈 Scalability Plan

### Current Architecture Limits

| Resource | Limit | Current Usage | Headroom |
|----------|-------|---------------|----------|
| Firestore writes | 10K/sec | ~50/sec | 200x |
| Cloud Functions | 1000 concurrent | ~10 concurrent | 100x |
| Gemini API | 60 req/min | ~10 req/min | 6x |

### Growth Strategy

**Phase 1 (0-1K users)**: Current architecture  
**Phase 2 (1K-10K users)**: Add Cloud Run for API Gateway  
**Phase 3 (10K-100K users)**: Multi-region deployment  
**Phase 4 (100K+ users)**: Microservices architecture

---

## 🎯 Success Metrics (SLIs/SLOs)

| Metric | Target (SLO) | Current |
|--------|-------------|---------|
| **Uptime** | 99.9% | TBD |
| **Page Load Time** | < 2s (p95) | TBD |
| **AI Analysis Time** | < 10s | TBD |
| **Data Sync Latency** | < 500ms | TBD |
| **Error Rate** | < 0.1% | TBD |

---

This architecture provides a **production-ready, scalable, cost-effective** foundation for Job Tracker v2. Next, I'll create the detailed PRD.


CHAT ASSESMENT
Excellent. I’ve reviewed your **Job Tracker v2 – GCP Architecture** in detail. This is **well above typical student-level work** and is already assessable as a junior production SaaS design. What follows is a **formal GCP architecture assessment**, focused on correctness, risk, cost, and maturity, with **explicit recommendations** for what to lock, what to revise, and what to defer.

All observations below are grounded in your submitted architecture document .

---

## 1. Overall Architectural Verdict

**Assessment:** ✅ **Approved with minor revisions**  
**Maturity Level:** Early production / strong portfolio SaaS  
**Google-native compliance:** Excellent  
**Cost discipline:** Strong  
**Scalability posture:** Correctly phased

You have chosen the **right primitives**:

- Firebase-first for velocity
    
- Firestore + BigQuery split for OLTP vs OLAP
    
- Event-driven Cloud Functions
    
- Gemini usage constrained and rate-limited
    

This is exactly how Google expects early-stage SaaS to be built.

---

## 2. High-Confidence Strengths (Do Not Change)

### 2.1 Serverless Boundary Choices

Your separation is correct:

- **Firestore** → user-facing transactional state
    
- **BigQuery** → analytics, aggregation, and reporting
    
- **Cloud Functions (2nd gen)** → glue logic, AI triggers, exports
    

This avoids the most common student mistake: overusing Cloud Run too early.

### 2.2 Firestore Data Modeling

Your structure:

```
users/{userId}/applications/{applicationId}
users/{userId}/aiAnalysis/{applicationId}
```

is:

- Multi-tenant safe
    
- Rule-enforceable
    
- Index-efficient
    
- Aligned with Firebase security semantics
    

This is **production-correct**.

### 2.3 Gemini Integration Strategy

You correctly:

- Trigger AI only on meaningful events
    
- Parse structured JSON
    
- Cache results
    
- Rate-limit per user
    

This avoids runaway costs and aligns with Gemini’s intended usage patterns.

---

## 3. Critical Adjustments You Should Make (Important)

These are not cosmetic. They materially improve robustness.

---

### 3.1 Firestore Trigger Explosion Risk

**Issue:**  
You are triggering AI analysis on **every document creation** in `applications`. This is correct now, but becomes risky once users begin editing frequently.

**Recommendation:**  
Introduce an **explicit analysis intent flag**.

```ts
// Only analyze when explicitly requested
if (!application.requestAnalysis) return;
```

**Why this matters:**

- Prevents accidental Gemini calls
    
- Allows freemium / quota-based gating later
    
- Enables UI-controlled AI usage
    

This is a **must-fix**.

---

### 3.2 BigQuery Streaming Inserts Cost Control

**Issue:**  
Streaming inserts are convenient but expensive at scale.

**Recommendation (Phase 1 safe):**  
Keep streaming inserts **for now**, but:

- Batch events via Pub/Sub once you exceed ~50k events/day
    
- Explicitly document this as a scalability milestone
    

Add a note in your architecture:

> “BigQuery streaming inserts will be replaced with batch load jobs at scale.”

This shows architectural foresight.

---

### 3.3 Authentication Token Verification in Functions

You rely implicitly on Firebase context. You should **explicitly verify ID tokens** for any callable or HTTP-triggered functions.

Example:

```ts
import { getAuth } from 'firebase-admin/auth';

const decoded = await getAuth().verifyIdToken(idToken);
```

This prevents privilege escalation if Cloud Run is introduced later.

---

## 4. Observability: One Missing Piece

Your logging is strong, but you are missing **trace correlation**.

### Recommendation: Add Correlation IDs

Generate a request ID per user action and propagate it through:

- Firestore write
    
- Cloud Function
    
- Gemini call
    
- BigQuery event
    

```ts
const requestId = crypto.randomUUID();

logger.info('AI analysis started', {
  requestId,
  userId,
  applicationId
});
```

This immediately elevates your system to **real operational maturity**.

---

## 5. Security Review (Passed, With One Enhancement)

### What You Did Right

- Strong Firestore rules
    
- Server-only AI writes
    
- Secret Manager usage
    
- Auth-gated reads
    

### Recommended Enhancement

Add **App Check** (reCAPTCHA or device-based) to:

- Protect Firestore
    
- Protect Cloud Functions
    
- Prevent scripted abuse of Gemini calls
    

This is extremely well regarded by reviewers.

---

## 6. Cost Model Reality Check

Your estimates are realistic.

However, Gemini cost variance is the only real risk.

### Recommendation

Add:

- Per-user monthly AI quota (e.g., 10 analyses)
    
- Hard server-side enforcement
    

This turns cost into a **product lever**, not a liability.

---

## 7. Architecture Readiness Scorecard

| Area                | Score    | Notes            |
| ------------------- | -------- | ---------------- |
| Google-native usage | 9.5 / 10 | Textbook         |
| Security            | 8.5 / 10 | Add App Check    |
| Cost discipline     | 9 / 10   | AI quotas needed |
| Scalability         | 9 / 10   | Phased correctly |
| Portfolio signal    | 10 / 10  | Recruiter-grade  |

---

## 8. What We Should Do Next (Recommended Order)

You are now at a decision point.

### Step 1 (Next)

**Lock the GCP architecture** with the minor fixes above.

I recommend next:

- A **finalized “GCP Architecture – v1.0”** with:
    
    - Explicit assumptions
    - Known limitations
    - Phase trigger
### Step 2

Move to **PRD validation**:
- Feature scope sanity check
- AI feature prioritization
- MVP vs v1.1 separation
### Step 3
Create:
- Firestore rules test plan
- Cost guardrails checklist
- First-week production metrics    

---



GCP Assessment
## 1. Overall Architectural Verdict

**Assessment:** ✅ **Approved with minor revisions**  
**Maturity Level:** Early production / strong portfolio SaaS  
**Google-native compliance:** Excellent  
**Cost discipline:** Strong  
**Scalability posture:** Correctly phased

You have chosen the **right primitives**:

- Firebase-first for velocity
    
- Firestore + BigQuery split for OLTP vs OLAP
    
- Event-driven Cloud Functions
    
- Gemini usage constrained and rate-limited
    

This is exactly how Google expects early-stage SaaS to be built.

---

## 2. High-Confidence Strengths (Do Not Change)

### 2.1 Serverless Boundary Choices

Your separation is correct:

- **Firestore** → user-facing transactional state
    
- **BigQuery** → analytics, aggregation, and reporting
    
- **Cloud Functions (2nd gen)** → glue logic, AI triggers, exports
    

This avoids the most common student mistake: overusing Cloud Run too early.

### 2.2 Firestore Data Modeling

Your structure:

`users/{userId}/applications/{applicationId} users/{userId}/aiAnalysis/{applicationId}`

is:

- Multi-tenant safe
    
- Rule-enforceable
    
- Index-efficient
    
- Aligned with Firebase security semantics
    

This is **production-correct**.

### 2.3 Gemini Integration Strategy

You correctly:

- Trigger AI only on meaningful events
    
- Parse structured JSON
    
- Cache results
    
- Rate-limit per user
    

This avoids runaway costs and aligns with Gemini’s intended usage patterns.

---

## 3. Critical Adjustments You Should Make (Important)

These are not cosmetic. They materially improve robustness.

---

### 3.1 Firestore Trigger Explosion Risk

**Issue:**  
You are triggering AI analysis on **every document creation** in `applications`. This is correct now, but becomes risky once users begin editing frequently.

**Recommendation:**  
Introduce an **explicit analysis intent flag**.

`// Only analyze when explicitly requested if (!application.requestAnalysis) return;`

**Why this matters:**

- Prevents accidental Gemini calls
    
- Allows freemium / quota-based gating later
    
- Enables UI-controlled AI usage
    

This is a **must-fix**.

---

### 3.2 BigQuery Streaming Inserts Cost Control

**Issue:**  
Streaming inserts are convenient but expensive at scale.

**Recommendation (Phase 1 safe):**  
Keep streaming inserts **for now**, but:

- Batch events via Pub/Sub once you exceed ~50k events/day
    
- Explicitly document this as a scalability milestone
    

Add a note in your architecture:

> “BigQuery streaming inserts will be replaced with batch load jobs at scale.”

This shows architectural foresight.

---

### 3.3 Authentication Token Verification in Functions

You rely implicitly on Firebase context. You should **explicitly verify ID tokens** for any callable or HTTP-triggered functions.

Example:

`import { getAuth } from 'firebase-admin/auth';  const decoded = await getAuth().verifyIdToken(idToken);`

This prevents privilege escalation if Cloud Run is introduced later.

---

## 4. Observability: One Missing Piece

Your logging is strong, but you are missing **trace correlation**.

### Recommendation: Add Correlation IDs

Generate a request ID per user action and propagate it through:

- Firestore write
    
- Cloud Function
    
- Gemini call
    
- BigQuery event
    

`const requestId = crypto.randomUUID();  logger.info('AI analysis started', {   requestId,   userId,   applicationId });`

This immediately elevates your system to **real operational maturity**.

---

## 5. Security Review (Passed, With One Enhancement)

### What You Did Right

- Strong Firestore rules
    
- Server-only AI writes
    
- Secret Manager usage
    
- Auth-gated reads
    

### Recommended Enhancement

Add **App Check** (reCAPTCHA or device-based) to:

- Protect Firestore
    
- Protect Cloud Functions
    
- Prevent scripted abuse of Gemini calls
    

This is extremely well regarded by reviewers.

---

## 6. Cost Model Reality Check

Your estimates are realistic.

However, Gemini cost variance is the only real risk.

### Recommendation

Add:

- Per-user monthly AI quota (e.g., 10 analyses)
    
- Hard server-side enforcement
    

This turns cost into a **product lever**, not a liability.

---

## 7. Architecture Readiness Scorecard

|Area|Score|Notes|
|---|---|---|
|Google-native usage|9.5 / 10|Textbook|
|Security|8.5 / 10|Add App Check|
|Cost discipline|9 / 10|AI quotas needed|
|Scalability|9 / 10|Phased correctly|
|Portfolio signal|10 / 10|Recruiter-grade|

---

# Product Requirement Document

References JT_V2_PRD.MD (see below)
## 1. Executive Summary

### Problem Statement

Job seekers applying to 50+ companies face several challenges:
- **No centralized tracking** - Applications scattered across emails, spreadsheets
- **No actionable insights** - Unable to identify patterns in rejections/success
- **Manual resume tailoring** - Time-consuming customization for each role
- **Missed follow-ups** - No systematic reminder system
- **Poor analytics** - Limited understanding of application effectiveness

### Solution Overview

Job Tracker v2 is an **AI-augmented SaaS platform** that:
1. **Centralizes** all job applications in one real-time dashboard
2. **Analyzes** resume-job fit using Gemini AI
3. **Generates** tailored cover letters and interview prep
4. **Surfaces** behavioral insights and success patterns
5. **Automates** follow-up tracking and notifications

### Key Differentiators (vs v1)

| Feature | v1 (Firebase) | v2 (Google Cloud) |
|---------|--------------|------------------|
| AI Integration | ❌ None | ✅ Gemini-powered analysis |
| Analytics | ✅ Basic charts | ✅ BigQuery + ML insights |
| Automation | ❌ Manual only | ✅ Cloud Functions workflows |
| Scalability | ⚠️ Single-region | ✅ Multi-region capable |
| Data Warehouse | ❌ None | ✅ BigQuery for advanced queries |
| Cost Visibility | ❌ Unknown | ✅ Budget alerts |

---

## 2. Product Vision & Goals

### Vision Statement

> "Empower every job seeker with AI-driven insights that transform job hunting from a numbers game into a strategic, data-informed process."

### Product Goals (SMART)

1. **User Acquisition**: 1,000 active users by Q3 2026
2. **Engagement**: 70% weekly active user rate
3. **AI Adoption**: 80% of users use AI features within first week
4. **Retention**: 60% 30-day retention rate
5. **Performance**: 99.5% uptime, <2s page load time

### Business Goals

1. **Portfolio Value**: Demonstrate production-grade Google Cloud expertise
2. **Technical Growth**: Master serverless, event-driven architecture
3. **Product Thinking**: Build measurable, user-centric features
4. **Career Positioning**: Signal readiness for cloud engineer / SaaS dev roles

---

## 3. Target Users

### Primary Persona: Sarah - Recent Graduate

**Demographics**:
- Age: 22-25
- Education: Bachelor's in Computer Science
- Location: South Africa (Gauteng)
- Visa Status: Seeking sponsorship

**Behaviors**:
- Applies to 50-100+ companies over 3-6 months
- Uses Google Sheets or notes app currently
- Active on LinkedIn, job boards
- Overwhelmed by application volume

**Pain Points**:
- "I don't know which companies I've already applied to"
- "I can't tell if my resume matches the job description"
- "I forget to follow up after interviews"
- "I don't know if I'm improving or just applying randomly"

**Goals**:
- Land a graduate software engineer role
- Get visa sponsorship
- Track application pipeline effectively
- Improve resume/interview performance

**Success Criteria**:
- Receives more interview callbacks
- Identifies which companies to prioritize
- Feels organized and in control

### Secondary Persona: James - Career Switcher

**Demographics**:
- Age: 28-35
- Background: Non-tech → Software Development
- Education: Bootcamp graduate
- Location: Urban centers (JHB, CPT, DBN)

**Behaviors**:
- Selective applicant (10-30 companies)
- Needs to prove technical skills
- Limited network in tech
- Time-constrained (working while job hunting)

**Pain Points**:
- "I need to show I'm serious despite non-traditional background"
- "I don't have time to apply everywhere"
- "I need to understand what's working in my approach"

**Goals**:
- Break into tech industry
- Optimize limited application time
- Build confidence in job search strategy

---

## 4. User Stories & Acceptance Criteria

### Epic 1: Core Application Management

#### US-1.1: As a user, I want to add a new job application so I can track it in one place

**Acceptance Criteria**:
- [ ] Form has required fields: Company, Role, Date Applied
- [ ] Form has optional fields: Visa Sponsorship, Notes, Resume Upload
- [ ] Validation prevents duplicate applications (same company + role within 30 days)
- [ ] Success confirmation shows after submission
- [ ] New application appears in dashboard immediately (real-time sync)
- [ ] Mobile-friendly form (responsive design)

**Priority**: P0 (Must Have)  
**Effort**: 2 days  
**Dependencies**: Firebase Auth, Firestore setup

---

#### US-1.2: As a user, I want to update application status so I can track my pipeline

**Acceptance Criteria**:
- [ ] Can change status via dropdown: Applied → Phone Screen → Technical Interview → Final Round → Offer/Rejected
- [ ] Status change is reflected instantly (optimistic update)
- [ ] Status history is recorded (audit trail)
- [ ] Visual feedback on status change (animation)
- [ ] Can revert to previous status if needed

**Priority**: P0 (Must Have)  
**Effort**: 1 day  
**Dependencies**: US-1.1

---

#### US-1.3: As a user, I want to delete applications so I can remove duplicates or mistakes

**Acceptance Criteria**:
- [ ] Confirmation dialog before deletion
- [ ] Soft delete (move to archive for 30 days)
- [ ] Ability to restore from archive
- [ ] Permanent delete after 30 days (automated cleanup)
- [ ] Deletion removes associated AI analysis

**Priority**: P1 (Should Have)  
**Effort**: 1 day  
**Dependencies**: US-1.1

---

### Epic 2: AI-Powered Insights

#### US-2.1: As a user, I want AI to analyze my resume-job fit so I know if I'm a strong candidate

**Acceptance Criteria**:
- [ ] Analysis triggered automatically on new application
- [ ] Loading indicator shows during analysis (5-10s)
- [ ] Results include:
  - Fit score (0-100)
  - 3-5 matching skills highlighted
  - 2-3 gaps identified
  - Actionable suggestions
- [ ] Analysis stored and retrievable (no re-analysis needed)
- [ ] Error handling if AI service fails
- [ ] Respects rate limits (max 10 analyses per hour per user)

**Priority**: P0 (Must Have)  
**Effort**: 5 days  
**Dependencies**: Gemini API integration, Cloud Functions

---

#### US-2.2: As a user, I want AI to generate a tailored cover letter draft so I save time

**Acceptance Criteria**:
- [ ] Button to "Generate Cover Letter" on application detail page
- [ ] Inputs: Company name, role, user's resume summary
- [ ] Output: 200-300 word cover letter draft
- [ ] Editable text area (user can modify)
- [ ] Copy to clipboard button
- [ ] Export as .txt or .docx
- [ ] Rate limited (3 generations per day for free users)

**Priority**: P1 (Should Have)  
**Effort**: 4 days  
**Dependencies**: US-2.1, Gemini API

---

#### US-2.3: As a user, I want AI to summarize the job description so I quickly understand requirements

**Acceptance Criteria**:
- [ ] User can paste job description (up to 5000 characters)
- [ ] AI extracts:
  - Key requirements (3-5)
  - Nice-to-haves (2-3)
  - Tech stack
  - Seniority level estimate
- [ ] Summary displayed in card format
- [ ] Processing time < 5 seconds

**Priority**: P2 (Nice to Have)  
**Effort**: 3 days  
**Dependencies**: US-2.1

---

### Epic 3: Advanced Analytics

#### US-3.1: As a user, I want to see my application funnel so I understand my conversion rates

**Acceptance Criteria**:
- [ ] Funnel chart shows: Applied → Phone Screen → Tech Interview → Final → Offer
- [ ] Percentages calculated automatically
- [ ] Click on funnel stage to filter applications
- [ ] Color-coded stages (green = healthy, yellow = needs improvement)
- [ ] Comparison to platform average (anonymized data)

**Priority**: P0 (Must Have)  
**Effort**: 3 days  
**Dependencies**: BigQuery integration

---

#### US-3.2: As a user, I want to see my weekly application velocity so I stay on track

**Acceptance Criteria**:
- [ ] Line chart showing applications per week (last 12 weeks)
- [ ] Weekly goal indicator (user-configurable)
- [ ] Trend line (increasing/decreasing)
- [ ] Export chart as PNG

**Priority**: P1 (Should Have)  
**Effort**: 2 days  
**Dependencies**: US-3.1

---

#### US-3.3: As a user, I want to identify drop-off points so I can improve my approach

**Acceptance Criteria**:
- [ ] Heat map showing where applications fail most
- [ ] Insights like: "60% of applications don't get past Phone Screen"
- [ ] Suggested actions: "Consider improving technical interview prep"
- [ ] Filter by date range, company, or role type

**Priority**: P1 (Should Have)  
**Effort**: 4 days  
**Dependencies**: US-3.1, BigQuery analytics

---

#### US-3.4: As a user, I want to see which companies have the best success rates so I can prioritize

**Acceptance Criteria**:
- [ ] Table ranking companies by offer rate
- [ ] Minimum 5 applications per company to show in ranking
- [ ] Filters: Visa-friendly, remote, specific location
- [ ] Click company to see all applications to that company

**Priority**: P2 (Nice to Have)  
**Effort**: 2 days  
**Dependencies**: BigQuery aggregations

---

### Epic 4: Automation & Notifications

#### US-4.1: As a user, I want automated follow-up reminders so I don't miss opportunities

**Acceptance Criteria**:
- [ ] Auto-remind after 7 days if status = "Applied"
- [ ] Auto-remind 1 day before scheduled interview
- [ ] Email + in-app notification
- [ ] User can snooze or dismiss
- [ ] User can configure reminder settings

**Priority**: P1 (Should Have)  
**Effort**: 5 days  
**Dependencies**: Cloud Functions, Email service integration

---

#### US-4.2: As a user, I want a weekly summary email so I track my progress

**Acceptance Criteria**:
- [ ] Email sent every Sunday at 6 PM (user's timezone)
- [ ] Includes:
  - Total applications this week
  - Status breakdown
  - Success rate
  - Upcoming interviews
- [ ] Opt-in/opt-out setting
- [ ] HTML email template (mobile-responsive)

**Priority**: P2 (Nice to Have)  
**Effort**: 3 days  
**Dependencies**: Cloud Scheduler, Email templates

---

### Epic 5: Data Management

#### US-5.1: As a user, I want to export my data so I can use it elsewhere

**Acceptance Criteria**:
- [ ] Export formats: CSV, JSON, PDF
- [ ] CSV includes all application fields + AI analysis
- [ ] PDF is formatted report with charts
- [ ] Download triggered via button
- [ ] Generation time < 10 seconds for 100 applications

**Priority**: P1 (Should Have)  
**Effort**: 4 days  
**Dependencies**: Cloud Functions for PDF generation

---

#### US-5.2: As a user, I want to import applications from a spreadsheet so I don't re-enter data

**Acceptance Criteria**:
- [ ] Accepts CSV upload
- [ ] Column mapping interface (map CSV columns to app fields)
- [ ] Validation before import
- [ ] Preview of first 5 rows
- [ ] Bulk import (max 200 applications at once)
- [ ] Error report if rows fail validation

**Priority**: P2 (Nice to Have)  
**Effort**: 5 days  
**Dependencies**: CSV parser, validation logic

---

#### US-5.3: As a user, I want to delete my account and data so I comply with my privacy rights

**Acceptance Criteria**:
- [ ] "Delete Account" button in settings
- [ ] Confirmation dialog with password re-entry
- [ ] Warning that action is permanent
- [ ] All Firestore data deleted within 24 hours
- [ ] BigQuery data anonymized (user_id replaced with hash)
- [ ] Email confirmation sent
- [ ] GDPR compliant

**Priority**: P1 (Should Have - Legal requirement)  
**Effort**: 3 days  
**Dependencies**: Cloud Functions for cleanup

---

## 5. Feature Requirements

### 5.1 Core Features (v2.0.0 Launch)

| Feature | Description | Priority | Effort |
|---------|-------------|----------|--------|
| **Multi-User Auth** | Firebase Auth with Google OAuth | P0 | 3 days |
| **Real-Time Dashboard** | Firestore-synced application list | P0 | 5 days |
| **AI Resume Analysis** | Gemini-powered fit scoring | P0 | 5 days |
| **Application Funnel** | Conversion rate analytics | P0 | 3 days |
| **Status Management** | Update application pipeline stage | P0 | 2 days |
| **Search & Filter** | Find applications by company/status | P0 | 2 days |
| **Mobile Responsive** | Full mobile UX | P0 | Ongoing |

**Total Core Development**: ~20 days

---

### 5.2 Enhanced Features (v2.1.0 - Post-Launch)

| Feature | Description | Priority | Effort |
|---------|-------------|----------|--------|
| **Cover Letter Gen** | AI-generated drafts | P1 | 4 days |
| **Follow-Up Reminders** | Automated email notifications | P1 | 5 days |
| **Weekly Reports** | Scheduled analytics summary | P1 | 3 days |
| **Drop-Off Analysis** | Identify failure points | P1 | 4 days |
| **Data Export** | CSV/JSON/PDF downloads | P1 | 4 days |

**Total Enhanced Development**: ~20 days

---

### 5.3 Advanced Features (v2.2.0+ - Future)

| Feature | Description | Priority | Effort |
|---------|-------------|----------|--------|
| **Job Description Parser** | AI summarization | P2 | 3 days |
| **Interview Prep** | AI-generated practice questions | P2 | 5 days |
| **Company Rankings** | Success rate comparison | P2 | 2 days |
| **CSV Import** | Bulk data upload | P2 | 5 days |
| **Dark Mode** | UI theme toggle | P2 | 2 days |
| **Collaboration** | Share applications with mentors | P2 | 7 days |

**Total Advanced Development**: ~24 days

---

## 6. Technical Requirements

### 6.1 Frontend Requirements

**Tech Stack**:
- React 18.2+ with TypeScript 5.0+
- Vite 5.0+ (build tool)
- Tailwind CSS 3.4+
- TanStack Query v5 (data fetching)
- Zustand (global state)
- Recharts (analytics visualization)

**Browser Support**:
- Chrome 100+
- Firefox 100+
- Safari 15+
- Edge 100+
- Mobile Safari (iOS 15+)
- Chrome Mobile (Android 10+)

**Performance Targets**:
- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1
- Lighthouse Score: 90+ (all categories)

**Accessibility**:
- WCAG 2.1 Level AA compliance
- Keyboard navigation support
- Screen reader compatible
- Color contrast ratio 4.5:1 minimum

---

### 6.2 Backend Requirements

**Cloud Functions**:
- Runtime: Node.js 20
- Memory: 256MB-512MB per function
- Timeout: 60s max
- Region: us-central1 (primary)
- Concurrency: 80 per instance

**Firestore**:
- Mode: Native
- Location: us-central (multi-region for HA)
- Backup: Daily automated snapshots
- Retention: 30 days

**BigQuery**:
- Dataset: job_tracker
- Location: US (multi-region)
- Partitioning: By event timestamp (daily)
- Clustering: user_id, company
- Streaming inserts: Enabled

**Gemini API**:
- Model: gemini-1.5-flash (cost-effective)
- Max tokens: 2048 per request
- Temperature: 0.7
- Rate limit: 60 requests/min per user
- Fallback: gemini-1.0-pro if flash unavailable

---

### 6.3 Security Requirements

**Authentication**:
- Firebase Authentication required for all routes
- Session duration: 14 days
- Refresh tokens: Automatic rotation
- MFA: Optional (future enhancement)

**Authorization**:
- User can only access their own data
- Admin role for support (future)
- Service accounts for Cloud Functions

**Data Protection**:
- Encryption at rest: Automatic (Google-managed keys)
- Encryption in transit: TLS 1.3
- API keys: Stored in Secret Manager
- PII handling: Minimal collection, user consent required

**Compliance**:
- GDPR: Data export, deletion, consent management
- POPIA (South Africa): Data privacy standards
- Firebase Terms of Service

---

### 6.4 Integration Requirements

**Third-Party Services**:
- Firebase (Auth, Firestore, Hosting, Functions)
- Google Cloud (BigQuery, Secret Manager, Logging)
- Gemini API (AI/ML)
- SendGrid (Email) - Optional in v2.0

**APIs to Build**:
- RESTful API for future mobile app (Cloud Run)
- Webhooks for external integrations (future)

---

## 7. Non-Functional Requirements

### 7.1 Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Page Load Time | < 2s (p95) | Lighthouse, RUM |
| API Response Time | < 500ms (p95) | Cloud Monitoring |
| AI Analysis Time | < 10s | Function execution logs |
| Real-Time Sync Latency | < 500ms | Firestore metrics |
| Database Query Time | < 100ms (p95) | Firestore console |

---

### 7.2 Scalability

**Current Target**: 1,000 users, 10,000 applications/month

**Scaling Thresholds**:
- 0-1K users: Current architecture
- 1K-10K users: Add Cloud Run API Gateway, multi-region Firestore
- 10K-100K users: Microservices, CDN optimization
- 100K+ users: Re-architecture discussion

**Auto-Scaling**:
- Cloud Functions: Automatic (0-1000 instances)
- Firestore: Unlimited horizontal scaling
- BigQuery: Automatic (slot-based)

---

### 7.3 Reliability

**Uptime Target**: 99.5% (SLO)

**Error Budget**: 0.5% (36.5 hours/month)

**Disaster Recovery**:
- Firestore: Automated daily backups
- BigQuery: Time-travel queries (7 days)
- Cloud Functions: Retry logic for transient failures
- RTO (Recovery Time Objective): 1 hour
- RPO (Recovery Point Objective): 5 minutes

**Monitoring**:
- Cloud Logging for all services
- Error Reporting for exception tracking
- Uptime checks every 60 seconds
- Alerting to email + Slack (future)

---

### 7.4 Maintainability

**Code Quality**:
- TypeScript strict mode enabled
- ESLint + Prettier configured
- Test coverage: 70%+ for critical paths
- Code reviews required for all PRs

**Documentation**:
- README with setup instructions
- API documentation (JSDoc)
- Architecture diagrams (Mermaid)
- Deployment runbook

**Version Control**:
- Git with conventional commits
- Feature branches + PR workflow
- Semantic versioning (semver)

---

### 7.5 Usability

**Onboarding**:
- First-time user tutorial (3 steps)
- Demo data option
- Help tooltips on complex features

**User Experience**:
- Loading states for all async operations
- Error messages: Clear, actionable
- Success confirmations: Toast notifications
- Empty states: Friendly illustrations + CTAs

**Accessibility**:
- Keyboard shortcuts for power users
- Alt text for all images
- ARIA labels for interactive elements
- Focus indicators visible

---

## 8. Success Metrics

### 8.1 Key Performance Indicators (KPIs)

| KPI | Target | Measurement Method |
|-----|--------|-------------------|
| **User Acquisition** | 1,000 users by Q3 2026 | Firebase Auth console |
| **Weekly Active Users (WAU)** | 70% of total users | Custom analytics |
| **AI Feature Adoption** | 80% use AI within first week | BigQuery events |
| **30-Day Retention** | 60% | Cohort analysis |
| **Average Applications/User** | 25 | Firestore aggregation |
| **Session Duration** | 5+ minutes | Google Analytics |
| **Error Rate** | < 0.1% | Cloud Error Reporting |

---

### 8.2 User Satisfaction Metrics

**Net Promoter Score (NPS)**: Target 40+

**Survey Questions** (post-onboarding):
1. How likely are you to recommend this app? (0-10)
2. What feature did you find most valuable?
3. What would improve your experience?

**Measurement**: In-app survey after 2 weeks of use

---

### 8.3 Technical Metrics

| Metric | Target | Tool |
|--------|--------|------|
| Lighthouse Performance | 90+ | CI/CD check |
| Lighthouse Accessibility | 95+ | CI/CD check |
| Test Coverage | 70%+ | Jest/Vitest |
| Build Time | < 2 minutes | GitHub Actions |
| Deploy Time | < 5 minutes | Firebase CLI |
| P95 API Latency | < 500ms | Cloud Monitoring |

---

## 9. Release Plan

### 9.1 12-Week Implementation Timeline

#### **Phase 1: Foundation (Weeks 1-3)**

**Week 1: Project Setup**
- [ ] Initialize React + TypeScript + Vite project
- [ ] Configure Firebase (Auth, Firestore, Hosting)
- [ ] Set up Tailwind CSS + component library
- [ ] Configure ESLint, Prettier, Vitest
- [ ] Create CI/CD pipeline (GitHub Actions)

**Week 2: Authentication & Core UI**
- [ ] Implement Firebase Auth (Email + Google OAuth)
- [ ] Build auth flows (Sign up, Sign in, Sign out)
- [ ] Create main layout (Header, Sidebar, Content)
- [ ] Build dashboard skeleton
- [ ] Set up routing

**Week 3: Application CRUD**
- [ ] Build "Add Application" form
- [ ] Implement Firestore create operation
- [ ] Build application cards/table view
- [ ] Implement real-time sync
- [ ] Add update/delete functionality

**Milestone 1 Demo**: User can sign up, add applications, see real-time updates

---

#### **Phase 2: AI Integration (Weeks 4-6)**

**Week 4: Gemini API Setup**
- [ ] Set up Gemini API credentials
- [ ] Create Cloud Function for AI analysis
- [ ] Implement rate limiting
- [ ] Build UI for analysis results
- [ ] Handle errors gracefully

**Week 5: AI Features - Resume Analysis**
- [ ] Trigger analysis on application creation
- [ ] Display fit score (0-100)
- [ ] Show matching skills
- [ ] Highlight gaps
- [ ] Suggest improvements

**Week 6: AI Features - Cover Letter Gen**
- [ ] Build cover letter generation UI
- [ ] Integrate Gemini for generation
- [ ] Add copy/export functionality
- [ ] Implement daily rate limit (3 per day)
- [ ] Cache generated letters

**Milestone 2 Demo**: AI analysis works, cover letters generate

---

#### **Phase 3: Analytics (Weeks 7-9)**

**Week 7: BigQuery Setup**
- [ ] Create BigQuery dataset + tables
- [ ] Set up streaming exports from Firestore
- [ ] Build Cloud Function for event logging
- [ ] Test data pipeline

**Week 8: Analytics Dashboard**
- [ ] Build application funnel chart
- [ ] Create weekly velocity chart
- [ ] Add status distribution chart
- [ ] Implement filters (date range, company)

**Week 9: Advanced Analytics**
- [ ] Build drop-off analysis
- [ ] Create company success rankings
- [ ] Add time-in-status metrics
- [ ] Build export functionality (CSV/PDF)

**Milestone 3 Demo**: Full analytics dashboard with BigQuery data

---

#### **Phase 4: Automation (Weeks 10-11)**

**Week 10: Notifications**
- [ ] Set up Cloud Scheduler
- [ ] Build follow-up reminder function
- [ ] Integrate email service (SendGrid)
- [ ] Create email templates
- [ ] Add notification preferences

**Week 11: Weekly Reports**
- [ ] Build weekly analytics aggregation function
- [ ] Create HTML email template
- [ ] Schedule Sunday 6 PM sends
- [ ] Add opt-in/opt-out setting
- [ ] Test email delivery

**Milestone 4 Demo**: Automated emails working

---

#### **Phase 5: Polish & Launch (Week 12)**

**Week 12: Final Sprint**
- [ ] Performance optimization (Lighthouse 90+)
- [ ] Accessibility audit (WCAG AA)
- [ ] Security review
- [ ] Write user documentation
- [ ] Create demo video
- [ ] Production deployment
- [ ] Monitoring setup
- [ ] Launch announcement

**Launch Deliverables**:
- Live production app
- Documentation (README, API docs)
- Architecture diagrams
- Demo video (2-3 min)
- Blog post announcing launch

---

### 9.2 Version Roadmap

**v2.0.0 (Week 12)** - MVP Launch
- Core application management
- AI resume analysis
- Basic analytics
- Real-time sync
- Multi-user auth

**v2.1.0 (Week 16)** - Enhanced Features
- Cover letter generation
- Follow-up reminders
- Weekly reports
- Data export

**v2.2.0 (Week 20)** - Advanced Features
- Job description parser
- Interview prep AI
- CSV import
- Dark mode
- Mobile app (React Native)

**v3.0.0 (Week 28)** - Enterprise Features
- Team collaboration
- Admin dashboard
- Advanced role-based access
- Custom integrations
- White-label option

---

## 10. Risk Assessment

### 10.1 Technical Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Gemini API rate limits** | High | Medium | Cache results, batch requests, fallback to Gemini 1.0 |
| **Firebase costs exceed budget** | Medium | High | Set budget alerts, optimize queries, use local emulators |
| **BigQuery query costs** | Medium | Medium | Partition tables, set query limits, cache results |
| **Real-time sync issues** | Low | High | Implement offline support, retry logic, error boundaries |
| **Firestore security misconfiguration** | Medium | High | Automated security rules testing, peer review |

---

### 10.2 Product Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Low user adoption** | Medium | High | Beta testing with target users, iterate on feedback |
| **AI features not used** | Medium | Medium | Onboarding tutorial, value demonstration, UX improvements |
| **Feature bloat** | Medium | Medium | Stick to 12-week plan, prioritize ruthlessly |
| **Poor mobile UX** | Low | Medium | Mobile-first design, test on real devices |

---

### 10.3 Timeline Risks

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Scope creep** | High | High | Lock scope for v2.0, defer nice-to-haves to v2.1 |
| **Gemini API integration complexity** | Medium | Medium | Start early (Week 4), allocate buffer time |
| **BigQuery learning curve** | Medium | Low | Follow GCP tutorials, use sample queries |
| **Unforeseen bugs in production** | Medium | Medium | Comprehensive testing, staging environment |

---

## 11. Dependencies & Constraints

### 11.1 External Dependencies

- **Firebase Services**: Auth, Firestore, Hosting, Functions (2nd Gen)
- **Google Cloud**: BigQuery, Secret Manager, Cloud Logging
- **Gemini API**: AI/ML capabilities
- **SendGrid**: Email delivery (optional for v2.0)

### 11.2 Resource Constraints

- **Budget**: $50-100/month (must stay within)
- **Time**: 12 weeks to launch
- **Team Size**: Solo developer (you)
- **Availability**: Part-time (20-30 hours/week)

### 11.3 Knowledge Gaps to Address

- [ ] BigQuery SQL syntax
- [ ] Cloud Functions 2nd Gen patterns
- [ ] Gemini API prompt engineering
- [ ] Advanced Firestore security rules
- [ ] PDF generation in Node.js

**Learning Resources**:
- Google Cloud Skills Boost (free courses)
- Firebase YouTube channel
- Gemini API documentation
- BigQuery codelab

---

## 12. Assumptions

1. Users have basic tech literacy (can use web apps)
2. Users have resumes in digital format (PDF/DOCX)
3. Job applications are primarily tech industry focused
4. Users apply to 10+ companies (analytics viable)
5. Gemini API pricing remains stable during development
6. Firebase free tier is sufficient for beta testing

---

## 13. Out of Scope (v2.0)

The following features are **explicitly excluded** from v2.0:

- ❌ Mobile apps (iOS/Android native)
- ❌ Resume builder/editor
- ❌ Job board scraping/aggregation
- ❌ LinkedIn integration
- ❌ Team/collaboration features
- ❌ Payment/subscription system
- ❌ Multi-language support
- ❌ Interview scheduling integration
- ❌ Salary negotiation tools
- ❌ Company review integration

These may be considered for **v2.2+** based on user feedback.

---

## 14. Appendix

### 14.1 User Flow Diagrams

**New User Onboarding**:
```
Landing Page
  → Sign Up (Email/Google)
  → Email Verification
  → Welcome Screen
  → Tutorial (3 steps)
  → Add First Application
  → See AI Analysis
  → Dashboard
```

**Application Management Flow**:
```
Dashboard
  → Click "Add Application"
  →Fill Form
→ Submit
→ AI Analysis Triggered (Background)
→ Application Card Created
→ Analysis Results Shown (10s later)
→ View/Edit/Delete Options

**AI Feature Flow**:
Application Detail Page
→ Click "Analyze Fit"
→ Loading Spinner (5-10s)
→ Results Displayed:
- Fit Score
- Matching Skills
- Gaps
- Suggestions
→ Click "Generate Cover Letter"
→ Loading (5-10s)
→ Editable Draft Shown
→ Copy/Export

---

### 14.2 Data Model (Firestore)
```typescript
// User Document
interface User {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  createdAt: Timestamp;
  settings: {
    emailNotifications: boolean;
    timezone: string;
    weeklyGoal: number;
  };
}

// Application Document
interface Application {
  id: string; // Auto-generated
  company: string;
  role: string;
  status: 'Applied' | 'Phone Screen' | 'Technical Interview' | 'Final Round' | 'Offer' | 'Rejected';
  dateApplied: string; // YYYY-MM-DD
  visa: boolean;
  notes: string;
  resumeUrl?: string; // Cloud Storage URL
  jobDescriptionUrl?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// AI Analysis Document
interface AIAnalysis {
  applicationId: string;
  fitScore: number; // 0-100
  matchingSkills: string[];
  gaps: string[];
  suggestions: string[];
  generatedCoverLetter?: string;
  analyzedAt: Timestamp;
  version: string; // Model version
}

// Weekly Analytics Document
interface WeeklyAnalytics {
  weekId: string; // YYYY-WW
  weekStart: Timestamp;
  weekEnd: Timestamp;
  totalApplications: number;
  statusBreakdown: {
    Applied: number;
    'Phone Screen': number;
    'Technical Interview': number;
    'Final Round': number;
    Offer: number;
    Rejected: number;
  };
  successRate: number;
  averageResponseTimeDays: number;
  topCompanies: string[];
  generatedAt: Timestamp;
}
```

---

### 14.3 API Rate Limits

| Service | Limit | Enforcement |
|---------|-------|-------------|
| **Gemini API** | 60 req
/min per user | Cloud Functions middleware |
| **Firestore Writes** | 10K/sec (shared) | Automatic (Google-managed) |
| **Firestore Reads** | 10K/sec (shared) | Automatic (Google-managed) |
| **BigQuery Streaming** | 100K rows/sec | Automatic |
| **Cloud Functions Invocations** | 1000 concurrent | Automatic scaling |
| **Email Sends (SendGrid)** | 100/day (free tier) | Application logic |

**User-Facing Rate Limits**:
- AI Resume Analysis: 10 per hour
- Cover Letter Generation: 3 per day
- Data Exports: 5 per day
- Application Creates: 50 per day

---

### 14.4 Error Handling Strategy

**Frontend Error Categories**:

1. **Network Errors** (Firebase offline)
   - Display: "Connection lost. Changes will sync when online."
   - Action: Enable offline mode, queue operations
   - Recovery: Auto-retry on reconnection

2. **Validation Errors** (Invalid form input)
   - Display: Inline field-level errors
   - Action: Highlight fields, show correction hints
   - Recovery: User corrects and resubmits

3. **Authorization Errors** (Firestore security rules)
   - Display: "You don't have permission to access this."
   - Action: Redirect to sign-in if session expired
   - Recovery: Re-authenticate

4. **AI Service Errors** (Gemini API failure)
   - Display: "AI analysis temporarily unavailable. Try again in a moment."
   - Action: Log error, retry once automatically
   - Recovery: Manual retry button shown

5. **Quota Errors** (Rate limit exceeded)
   - Display: "Daily limit reached. Resets in X hours."
   - Action: Show countdown timer
   - Recovery: Wait or upgrade (future paid tier)

**Backend Error Handling**:

```typescript
// Cloud Function error wrapper
async function withErrorHandling<T>(
  operation: () => Promise<T>,
  context: { userId: string; operation: string }
): Promise<T> {
  try {
    return await operation();
  } catch (error: any) {
    // Log to Cloud Logging
    logger.error('Operation failed', {
      userId: context.userId,
      operation: context.operation,
      error: error.message,
      stack: error.stack
    });

    // Report to Error Reporting
    await reportError(error, context);

    // Determine if retryable
    if (isRetryableError(error)) {
      logger.info('Retrying operation', context);
      await sleep(1000);
      return await operation(); // Single retry
    }

    // Re-throw for caller to handle
    throw error;
  }
}
```

---

### 14.5 Testing Strategy

#### **Unit Tests (70% coverage target)**

**What to Test**:
- Data transformation functions
- Validation logic
- Analytics calculations
- Date utilities
- Firestore query builders

**Example**:
```typescript
// src/utils/__tests__/analytics.test.ts
import { calculateSuccessRate } from '../analytics';

describe('calculateSuccessRate', () => {
  it('calculates success rate correctly', () => {
    const applications = [
      { status: 'Offer' },
      { status: 'Rejected' },
      { status: 'Rejected' },
      { status: 'Offer' }
    ];
    
    expect(calculateSuccessRate(applications)).toBe(50);
  });

  it('returns 0 for no applications', () => {
    expect(calculateSuccessRate([])).toBe(0);
  });

  it('handles all rejected applications', () => {
    const applications = [
      { status: 'Rejected' },
      { status: 'Rejected' }
    ];
    
    expect(calculateSuccessRate(applications)).toBe(0);
  });
});
```

#### **Integration Tests**

**What to Test**:
- Firestore CRUD operations (using emulator)
- Cloud Functions (using Functions emulator)
- Authentication flows
- AI API integration (mocked)

**Example**:
```typescript
// functions/__tests__/aiAnalysis.test.ts
import { testEnv } from './test-environment';

describe('AI Analysis Function', () => {
  it('triggers on application creation', async () => {
    const app = {
      company: 'Google',
      role: 'SWE',
      status: 'Applied',
      dateApplied: '2026-01-10',
      visa: true
    };

    // Create application
    await testEnv.firestore()
      .collection('users/test-user/applications')
      .add(app);

    // Wait for function to execute
    await testEnv.waitForFunction('analyzeApplication');

    // Verify analysis was created
    const analysis = await testEnv.firestore()
      .doc('users/test-user/aiAnalysis/app-id')
      .get();

    expect(analysis.exists).toBe(true);
    expect(analysis.data().fitScore).toBeGreaterThan(0);
  });
});
```

#### **E2E Tests (Cypress/Playwright)**

**Critical User Flows**:
1. Sign up → Add application → See AI analysis
2. Sign in → View dashboard → Update status
3. View analytics → Export data
4. Generate cover letter → Copy to clipboard

**Example**:
```typescript
// e2e/application-flow.spec.ts
describe('Application Management', () => {
  it('completes full application flow', () => {
    // Sign in
    cy.visit('/');
    cy.get('[data-testid="sign-in-btn"]').click();
    cy.get('[data-testid="email-input"]').type('test@example.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="submit-btn"]').click();

    // Add application
    cy.get('[data-testid="add-app-btn"]').click();
    cy.get('[data-testid="company-input"]').type('Google');
    cy.get('[data-testid="role-input"]').type('Software Engineer');
    cy.get('[data-testid="date-input"]').type('2026-01-10');
    cy.get('[data-testid="visa-checkbox"]').check();
    cy.get('[data-testid="submit-app-btn"]').click();

    // Verify application appears
    cy.contains('Google').should('be.visible');
    
    // Wait for AI analysis
    cy.get('[data-testid="ai-analysis"]', { timeout: 15000 })
      .should('be.visible');
    
    // Verify fit score shown
    cy.get('[data-testid="fit-score"]')
      .should('contain', '/100');
  });
});
```

#### **Performance Tests**

**Load Testing Scenarios**:
1. 100 concurrent users adding applications
2. 1000 real-time Firestore listeners
3. BigQuery query with 100K records
4. AI analysis with 50 concurrent requests

**Tools**: Apache JMeter, Artillery, or k6

---

### 14.6 Deployment Checklist

**Pre-Deployment**:
- [ ] All tests passing (unit, integration, e2e)
- [ ] Lighthouse score 90+ (all categories)
- [ ] Security rules tested in emulator
- [ ] Environment variables configured in Firebase
- [ ] API keys stored in Secret Manager
- [ ] Budget alerts configured (<$100/month)
- [ ] Error monitoring enabled
- [ ] Analytics tracking verified
- [ ] CORS settings configured
- [ ] Firebase quota limits reviewed

**Deployment Steps**:
```bash
# 1. Build production bundle
npm run build

# 2. Test production build locally
npm run preview

# 3. Deploy Cloud Functions
cd functions
npm run deploy

# 4. Deploy Firestore rules
firebase deploy --only firestore:rules

# 5. Deploy hosting
firebase deploy --only hosting

# 6. Verify deployment
curl https://job-tracker-prod.web.app/health

# 7. Run smoke tests
npm run test:e2e:prod

# 8. Monitor Cloud Logging for errors
gcloud logging tail --project=job-tracker-prod
```

**Post-Deployment**:
- [ ] Verify sign-up flow works
- [ ] Test AI analysis on production
- [ ] Check BigQuery data streaming
- [ ] Monitor error rates (first 24 hours)
- [ ] Review Cloud Logging for warnings
- [ ] Test on mobile devices
- [ ] Send test email notification
- [ ] Verify analytics dashboard loads

---

### 14.7 Monitoring & Alerting Setup

**Critical Alerts (Email + Slack)**:

1. **Error Rate > 1%** (5-minute window)
   ```yaml
   condition: error_rate > 0.01
   severity: CRITICAL
   notification: Immediate
   action: Investigate logs, roll back if needed
   ```

2. **Gemini API Failures > 10%** (10-minute window)
   ```yaml
   condition: gemini_error_rate > 0.10
   severity: HIGH
   notification: Within 15 minutes
   action: Check API quota, switch to fallback model
   ```

3. **Firestore Write Costs > $10/day**
   ```yaml
   condition: daily_firestore_cost > 10
   severity: MEDIUM
   notification: Daily summary
   action: Review query patterns, optimize writes
   ```

4. **BigQuery Query Costs > $5/day**
   ```yaml
   condition: daily_bigquery_cost > 5
   severity: MEDIUM
   notification: Daily summary
   action: Review query efficiency, add caching
   ```

**Warning Alerts (Email only)**:

5. **Page Load Time > 3s** (p95, 1-hour window)
6. **Cloud Function Cold Starts > 100/hour**
7. **User Sign-Up Rate < 5/day** (product metric)
8. **AI Feature Usage < 50%** (product metric)

**Dashboard Metrics** (Cloud Monitoring):
- Active users (real-time)
- Application creation rate
- AI analysis success rate
- Function execution time (p50, p95, p99)
- Firestore read/write operations
- BigQuery bytes processed
- Error rate by function
- Cost per service (daily)

---

### 14.8 Success Criteria Summary

**Launch Success (Week 12)**:
- [ ] 50 beta users signed up
- [ ] 500+ applications tracked
- [ ] AI analysis running for 80%+ of applications
- [ ] Zero critical bugs in production
- [ ] Lighthouse score 90+ maintained
- [ ] $0 in cloud costs (within free tiers)

**1-Month Post-Launch (Week 16)**:
- [ ] 200 active users
- [ ] 2,000+ applications tracked
- [ ] 70% weekly active user rate
- [ ] 50% 30-day retention
- [ ] NPS score 30+
- [ ] <$50/month in cloud costs

**3-Month Post-Launch (Week 24)**:
- [ ] 1,000 active users
- [ ] 10,000+ applications tracked
- [ ] 70% weekly active user rate
- [ ] 60% 30-day retention
- [ ] NPS score 40+
- [ ] <$100/month in cloud costs
- [ ] Featured in portfolio/resume
- [ ] Blog post with case study published

---

## 15. Approval & Sign-Off

**Document Owner**: Zawadi MC Nyachiya  
**Reviewers**: Self-review + AI advisor feedback  
**Status**: Draft → Ready for Implementation

**Next Steps**:
1. ✅ Review PRD (this document)
2. ⏳ Create Migration Strategy (v1 → v2)
3. ⏳ Begin Phase 1 implementation
4. ⏳ Weekly progress reviews

---

## 16. Change Log

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-01-11 | Initial PRD creation | Zawadi Nyachiya |
| 1.1 | TBD | Post-review updates | Zawadi Nyachiya |

---

## 17. Glossary

**AI**: Artificial Intelligence - Gemini API for natural language processing  
**BigQuery**: Google's data warehouse for analytics  
**Cloud Functions**: Serverless compute (Google Cloud)  
**Firestore**: NoSQL real-time database (Firebase)  
**Gemini**: Google's large language model API  
**NPS**: Net Promoter Score (user satisfaction metric)  
**PRD**: Product Requirements Document  
**SLO**: Service Level Objective (uptime target)  
**SaaS**: Software as a Service  
**TTI**: Time to Interactive (performance metric)  
**WAU**: Weekly Active Users

---

# PRD Teardown

The goal is to (1) eliminate ambiguity, (2) prevent scope creep, and (3) ensure that what you build is _shippable, assessable, and defensible_ in interviews.

4 Axes of teardown:
1. User problem clarity
2. Feature necessity
3. Technical dependency risk
4. Business/value signal
Anything that does not survive all four does **not** belong in MVP.
## 1.1 Core User Problem (Validated)

### Stated Problem

> Job seekers apply to many roles and lack visibility, feedback, and insight into what is working.

### Refined, MVP-Grade Problem Statement

> Early- to mid-career job seekers cannot tell **which applications are strong**, **where they are failing**, or **what to improve next**, leading to wasted effort and emotional fatigue.

This is:

- Concrete
- Measurable
- AI-appropriate
- Emotionally resonant (important for SaaS retention)

**Approved.**

---

## 1.2 Target User (Lock This)

Your PRD implicitly targets “job seekers,” which is too broad.

### Locked MVP Persona

**Primary Persona**

- 20–30 years old
- Applying to 10–100 roles
- Uses spreadsheets, Notion, or nothing
- Comfortable with web apps
- Resume already exists (PDF)

**Explicitly NOT MVP Users**

- Recruiters
- Hiring managers
- Senior executives
- Career coaches
- Enterprises

This matters because it constrains UX, pricing, and feature depth.

---

## 1.3 Feature Inventory (Teardown)

Below is your implied feature set, classified.

### 🟢 Core (Must Exist for Product to Make Sense)

| Feature                            | Verdict |
| ---------------------------------- | ------- |
| Job application CRUD               | KEEP    |
| Status tracking                    | KEEP    |
| Resume upload                      | KEEP    |
| AI resume–job fit score            | KEEP    |
| AI gap analysis                    | KEEP    |
| Basic analytics (counts, statuses) | KEEP    |

---

### 🟡 Valuable but Dangerous (Defer)

| Feature                       | Verdict | Reason                     |
| ----------------------------- | ------- | -------------------------- |
| Cover letter generation       | DEFER   | High UX + AI polish cost   |
| Interview question prediction | DEFER   | Weak signal early          |
| Company research summaries    | DEFER   | Non-core                   |
| Weekly email reports          | DEFER   | Operational overhead       |
| Advanced charts               | DEFER   | Can fake with simple stats |

These are **v1.1 features**, not MVP.

---

### 🔴 Kill Immediately (MVP Scope Poison)

| Feature                 | Verdict | Why                |
| ----------------------- | ------- | ------------------ |
| Multi-region deployment | KILL    | No MVP value       |
| Cloud Run API gateway   | KILL    | Premature          |
| Paid tiers              | KILL    | No validation yet  |
| ML training pipelines   | KILL    | You are not Google |
| Social features         | KILL    | Dilutes focus      |

If it doesn’t help a user _decide what to fix next_, it’s out.

---

# 2. MVP LOCK (THIS IS THE CONTRACT)

This section defines **exactly what you will build** and **nothing else**.

---

## 2.1 MVP Product Definition (One Sentence)

> A web application that lets users track job applications and receive AI-generated feedback on how well each application matches the role, highlighting gaps and next actions.

If a feature does not support this sentence, it does not ship.

---

## 2.2 MVP Feature List (Non-Negotiable)

### A. Authentication

- Email/password    
- Google OAuth
- Email verification

**No MFA. No magic links.**

---

### B. Application Tracking

Each application has:

- Company    
- Role
- Status (Applied, Interview, Rejected, Offer)
- Date applied
- Notes (free text)
- Resume reference (URL)

CRUD only. No workflows.

---

### C. AI Analysis (Explicitly User-Initiated)

This is critical.

**User Flow**

1. User creates or edits application    
2. User clicks **“Analyze Application”**
3. System runs Gemini
4. Results are stored and displayed

**AI Output (Strict Schema)**

```json
{
  "fitScore": 0-100,
  "matchingSkills": ["string"],
  "gaps": ["string"],
  "nextSteps": ["string"]
}
```

If Gemini cannot return this schema → fail gracefully.

---

### D. Analytics (MVP-Safe)

Only the following metrics:
- Total applications
- Applications per status
- Average applications per week
- Fit score distribution (simple)    

**No predictive analytics.**

---

### E. Data Export (Nice-to-Have but Acceptable)

- CSV export of applications    

This is low effort, high perceived value.

---

## 2.3 Explicit MVP Non-Goals (Write These in the PRD)

Your PRD **must include this section**.

> The MVP will NOT:

- Guarantee hiring outcomes    
- Replace career coaching
- Generate perfect resumes
- Optimize applications automatically
- Support recruiters or teams

This protects you from feature creep _and_ criticism.

---

# 3. MVP TECHNICAL LOCK

### Backend

- Firestore
- Cloud Functions (2nd gen)
- Gemini API
- BigQuery (write-only analytics)

### Frontend

- React + TypeScript
- Firebase SDK
- Minimal charts (Recharts or equivalent)

### Infrastructure

- Single region    
- Single Firebase project
- Manual environment separation (dev/prod later)

---

## 4. MVP SUCCESS METRICS (MEASURABLE)

If you cannot measure it, it is not a product.

### MVP KPIs

- Time to first AI analysis < 3 minutes after signup
- ≥ 50% of users run at least one analysis
- ≥ 30% return within 7 days
- AI error rate < 2%    

You do **not** need revenue metrics yet.

---

# 5. BUILD ORDER (CRITICAL)

Follow this exactly.

### Phase 1 – Foundation

- Auth
- Firestore rules
- Application CRUD
### Phase 2 – AI Value

- Resume upload
- AI analysis trigger
- Result display
### Phase 3 – Insight
- Basic analytics
- Fit score visualization
### Phase 4 – Polish

- CSV export
- Error states
- Loading UX

---

# 6. What This Signals to Assessors & Recruiters

If you ship **this MVP**:
- You demonstrate product thinking
- You demonstrate cost-aware AI usage
- You demonstrate Google-native cloud fluency
- You avoid “AI demo app” stigma

This is _portfolio-grade_, not student-grade.

---

# MVP USER FLOWS & SCREEN-BY-SCREEN UX (LOCKED)

## Design Principle (Read This Once)

> Every screen must answer **one question** for the user.  
> If it answers more than one, it is wrong.

---

# 1. USER FLOWS (TOP-DOWN)

There are **only four primary flows** in the MVP.

1. Onboarding → First application
2. Application tracking → Status updates
3. AI analysis → Insight consumption
4. Analytics → Reflection & decision-making

No branching beyond this.

---

# 2. SCREEN MAP (FINAL)

```
/login
/signup
/verify-email

/dashboard
/applications
/applications/new
/applications/:id

/applications/:id/analyze
/applications/:id/analysis

/analytics

/settings
```

If a screen is not listed here, it does not exist.

---

# 3. SCREEN-BY-SCREEN SPECIFICATION

## 3.1 Authentication Screens

### /signup

**User question:** “Can I get in quickly and safely?”

**Fields**

- Email
- Password
- Confirm password
- Sign up with Google

**Rules**

- No profile setup
- No preferences
- No copy-heavy onboarding

**Success →** `/dashboard` (with empty state)

---

### /verify-email

**User question:** “Why can’t I continue?”

Minimal copy:

> “Please verify your email to continue.”

No resend abuse. One button.

---

## 3.2 Dashboard (MVP Home)

### /dashboard

**User question:** “Am I making progress?”

**Contents (exactly these):**

- Total applications
- Status breakdown (Applied / Interview / Rejected / Offer)
- Button: **Add application**
- List: 5 most recent applications

**Explicitly excluded**

- Charts
- AI insights
- Trends

This is a **control panel**, not an analysis page.

---

## 3.3 Applications List

### /applications

**User question:** “What have I applied to?”

**Table Columns**

- Company
- Role
- Status
- Date applied
- Fit score (if exists, else “—”)

**Actions**

- Click row → detail page
- “Add application” button

No filters in MVP. Sorting optional.

---

## 3.4 Create Application

### /applications/new

**User question:** “How fast can I log this?”

**Fields**

- Company (required)
- Role (required)
- Date applied (default = today)
- Status (default = Applied)
- Notes (optional)
- Resume upload (optional)


**Rules**

- No AI here    
- No validation beyond basic required fields


**Submit →** `/applications/:id`

---

## 3.5 Application Detail (MOST IMPORTANT SCREEN)

### /applications/:id

**User question:** “Is this application strong?”

**Sections (in order)**

### A. Header

- Company
- Role
- Status (editable dropdown)

### B. Application Details

- Date applied
- Notes
- Resume link (if exists)

### C. AI Analysis CTA (Gate)

If no analysis exists:

> “Get AI feedback on this application.”

Button: **Analyze application**

This button is the **value moment** of the product.

---

## 3.6 AI Analysis Loading State

### /applications/:id/analyze

**User question:** “Is something happening?”

**UI**

- Spinner
    
- Copy:
    
    > “Analyzing your application. This usually takes under 10 seconds.”
    

**Failure states**

- Rate limit
- AI error
- Timeout    

All must resolve back to the detail page with a message.

---

## 3.7 AI Analysis Result

### /applications/:id/analysis

**User question:** “What should I fix next?”

**Sections (STRICT ORDER)**

### 1. Fit Score

- Large number (0–100)    
- Color-coded (red/yellow/green)
### 2. Matching Skills

Bullet list (3–5 items)

### 3. Gaps

Bullet list (2–3 items)

### 4. Next Steps

Actionable bullets (rewrite X, highlight Y)

**Rules**

- No editing AI output    
- No regeneration button in MVP    
- No chat UI


This is **feedback**, not conversation.

---

## 3.8 Analytics

### /analytics

**User question:** “Is my strategy working?”

**Metrics**

- Total applications
- Applications per status
- Average per week
- Fit score distribution (simple bar)

**Time range**

- Last 30 days only (hardcoded)

No custom queries.

---

## 3.9 Settings

### /settings

**User question:** “Can I control my data?”

**Options**

- Email notifications (on/off)
- Export data (CSV)
- Delete account


No themes. No preferences explosion.

---

# 4. UX CONSTRAINTS (VERY IMPORTANT)

### 4.1 AI Is Always User-Initiated

- No background AI
- No automatic triggers
- No surprises

This protects trust and cost.

---

### 4.2 Empty States Are Mandatory

Every list must explain what to do next:

> “You haven’t added any applications yet.”

This is part of the UX, not polish.

---

### 4.3 One Primary CTA Per Screen

If you see two, one is wrong.

---

# 5. HOW THIS MAPS TO YOUR GCP ARCHITECTURE

This UX:

- Aligns perfectly with Firestore subcollections
- Minimizes Cloud Function invocations
- Makes Gemini usage explicit and defensible
- Keeps BigQuery strictly analytical

No architectural changes required.

---

# FIRESTORE SECURITY & DATA INTEGRITY

The goal is to :
- Enforce tenant isolation
- Validate data at the database boundary
- Prevent privilege escalation
- Prove correctness

# 1. THREAT MODEL (EXPLICIT)

We assume:

- Frontend is **untrusted**    
- Firebase SDK can be scripted
- Users may attempt:
    - Reading other users’ data
    - Writing AI results manually
    - Injecting malformed documents
    - Spamming Gemini-triggering writes

Your rules must hold even if:

- The UI is bypassed
- Requests are replayed
- Fields are spoofed

---

# 2. DATABASE STRUCTURE (FINAL)

No ambiguity allowed.

```
/users/{userId}
  ├─ email
  ├─ createdAt
  ├─ settings
  │
  ├─ /applications/{applicationId}
  │
  ├─ /aiAnalysis/{applicationId}
  │
  ├─ /weeklyAnalytics/{weekId}
```

**Rule of thumb:**  
If it is user-owned → lives under `/users/{uid}`  
If it is system-owned → user cannot write it

---

# 3. GLOBAL RULES BASELINE

```firestore
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {

    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isCreate() {
      return request.resource.data.keys().size() > 0
        && !exists(resource);
    }

    function isUpdate() {
      return exists(resource);
    }
```

These helper functions:

- Reduce repetition
- Improve auditability
- Signal maturity to reviewers

---

# 4. USER DOCUMENT RULES

```firestore
    match /users/{userId} {

      allow read: if isOwner(userId);
      allow create: if isOwner(userId)
        && request.resource.data.keys().hasOnly([
          'email', 'createdAt', 'settings'
        ])
        && request.resource.data.createdAt == request.time;

      allow update: if isOwner(userId)
        && request.resource.data.diff(resource.data).changedKeys()
           .hasOnly(['settings']);

      allow delete: if false;
```

### Why this is strong

- User cannot change email arbitrarily
- User cannot backdate account creation
- User cannot delete themselves without backend logic

---

# 5. APPLICATIONS COLLECTION (CORE DATA)

This is the most critical section.

```firestore
      match /applications/{applicationId} {

        allow read: if isOwner(userId);

        allow create: if isOwner(userId)
          && request.resource.data.keys().hasOnly([
            'company',
            'role',
            'status',
            'dateApplied',
            'notes',
            'resumeUrl',
            'createdAt',
            'updatedAt',
            'requestAnalysis'
          ])
          && request.resource.data.company is string
          && request.resource.data.company.size() > 0
          && request.resource.data.company.size() <= 100
          && request.resource.data.role is string
          && request.resource.data.status in [
            'Applied', 'Interview', 'Rejected', 'Offer'
          ]
          && request.resource.data.createdAt == request.time
          && request.resource.data.updatedAt == request.time;

        allow update: if isOwner(userId)
          && request.resource.data.diff(resource.data).changedKeys()
             .hasOnly([
               'status',
               'notes',
               'updatedAt',
               'requestAnalysis'
             ])
          && request.resource.data.updatedAt == request.time;

        allow delete: if isOwner(userId);
```

---

## Key Design Decisions (Intentional)

### 5.1 `requestAnalysis` Flag

- User **explicitly opts into AI**
- Prevents hidden Gemini calls
- Enables future quotas

### 5.2 Immutable Fields

- `company`, `role`, `dateApplied` cannot be edited
- Prevents AI abuse via rewrite loops
- Enforces audit consistency

---

# 6. AI ANALYSIS COLLECTION (SERVER-ONLY)

This is where most juniors fail.

```firestore
      match /aiAnalysis/{analysisId} {

        allow read: if isOwner(userId);

        allow create, update, delete: if false;
      }
```

### Why this is non-negotiable

- AI output is **system truth**
- Users must not spoof scores
- Only Cloud Functions write here (Admin SDK bypasses rules)

---

# 7. WEEKLY ANALYTICS (SERVER-ONLY)

```firestore
      match /weeklyAnalytics/{weekId} {

        allow read: if isOwner(userId);
        allow write, delete: if false;
      }
```

Analytics are:

- Derived
- Non-authoritative
- Read-only

Correct handling.

---

# 8. COMMON ATTACKS (AND WHY THEY FAIL)

### Attack: Write AI result manually

❌ Blocked – no client writes allowed

### Attack: Change another user’s data

❌ Blocked – UID-bound path

### Attack: Add extra fields (e.g. `admin: true`)

❌ Blocked – `hasOnly(...)`

### Attack: Backdate applications

❌ Blocked – `createdAt == request.time`

---

# 9. TEST CASES (YOU SHOULD ACTUALLY RUN THESE)

You should document these in your repo.

|Test|Expected|
|---|---|
|User A reads User B app|DENY|
|User edits `company`|DENY|
|User writes to `aiAnalysis`|DENY|
|User omits `createdAt`|DENY|
|User toggles `requestAnalysis`|ALLOW|
|Cloud Function writes AI|ALLOW|

This is how you prove correctness.

---

# 10. FINAL SECURITY POSTURE

|Area|Status|
|---|---|
|Tenant isolation|STRONG|
|Data integrity|STRONG|
|AI abuse prevention|STRONG|
|Cost control|STRONG|
|Review readiness|EXCELLENT|

This ruleset is **production-grade for an MVP**.

---

# AI PROMPT ENGINEERING & FAILURE HANDLING

**(GEMINI · MVP-LOCKED · PRODUCTION-SAFE)**

---

## 1. AI DESIGN PHILOSOPHY (NON-NEGOTIABLE)

The system does **NOT**:

- Chat
- Speculate
- Improvise
- Rewrite resumes
- Make guarantees

Your system **ONLY**:

- Evaluates
- Scores
- Identifies gaps
- Suggests next actions

This positioning is what keeps you safe, credible, and assessable.

---

## 2. AI CONTRACT (THE MOST IMPORTANT PART)

Gemini is **not trusted**.  
Gemini is **not authoritative**.  
Gemini is **a probabilistic function that must be constrained**.

Therefore:

> **If Gemini output does not strictly conform to schema, it is discarded.**

No partial credit.

---

## 3. CANONICAL PROMPT (LOCK THIS)

This is the **only MVP prompt**.

`SYSTEM: You are an assistant that evaluates job applications. You must return VALID JSON ONLY. Do not include explanations, markdown, or commentary. Do not speculate beyond the provided information.  USER: Evaluate the following job application.  Context: - The applicant has already applied for this role. - Your task is to assess alignment and suggest improvements. - Do NOT guarantee outcomes.  Job Application: Company: {{company}} Role: {{role}} Status: {{status}}  Resume Content (if available): {{resumeText | "Not provided"}}  Return a JSON object with EXACTLY the following structure:  {   "fitScore": number (0–100),   "matchingSkills": string[] (3–5 items),   "gaps": string[] (2–3 items),   "nextSteps": string[] (2–4 items) }  Rules: - fitScore must be an integer. - matchingSkills must reference observable skills only. - gaps must be actionable and realistic. - nextSteps must be concrete actions the applicant can take. - If information is insufficient, infer conservatively. - Do not hallucinate company-specific details.`

### Why this works

- SYSTEM instruction constrains behavior
- JSON-only requirement enables validation
- Conservative inference rule reduces hallucinations
- No free text = no UX chaos

---

## 4. SERVER-SIDE ENFORCEMENT (MANDATORY)

### 4.1 Hard JSON Validation

`function validateAIResponse(data: any) {   return (     Number.isInteger(data.fitScore) &&     data.fitScore >= 0 &&     data.fitScore <= 100 &&     Array.isArray(data.matchingSkills) &&     data.matchingSkills.length >= 3 &&     data.matchingSkills.length <= 5 &&     Array.isArray(data.gaps) &&     data.gaps.length >= 2 &&     data.gaps.length <= 3 &&     Array.isArray(data.nextSteps) &&     data.nextSteps.length >= 2 &&     data.nextSteps.length <= 4   ); }`

If this fails → **discard output**.

---

### 4.2 Retry Logic (STRICT)

`const MAX_RETRIES = 2;  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {   const result = await callGemini(prompt);      try {     const parsed = JSON.parse(result);     if (validateAIResponse(parsed)) {       return parsed;     }   } catch (_) {}    if (attempt === MAX_RETRIES) {     throw new Error("AI_VALIDATION_FAILED");   } }`

No infinite retries.  
No silent degradation.

---

## 5. FAILURE MODES & UX HANDLING (ASSESSOR-READY)

### 5.1 Gemini Timeout / API Error

**Backend**

- Log error
- Do not write partial data
- Return failure state

**Frontend Message**

> “We couldn’t analyze this application right now. Please try again later.”

No technical jargon. No blame.

---

### 5.2 Schema Violation (Hallucination)

**Backend**

- Discard response
- Log validation failure
- Increment metric

**Frontend Message**

> “Analysis failed due to formatting issues. Please retry.”

This protects trust.

---

### 5.3 Rate Limit Exceeded

**Backend**

- Enforce per-user quota
- Reject early

**Frontend Message**

> “You’ve reached your analysis limit for now. Please try again later.”

This prepares for monetization later.

---

## 6. AI COST & TRUST CONTROLS

### 6.1 Per-User Quota (MVP DEFAULT)

- 5 analyses per user per week
- Enforced server-side
- Stored in Firestore or memory cache

This is **not optional**.

---

### 6.2 Caching Strategy

If:

- Same application
- Same resume
- Same role

→ Reuse existing analysis

This reduces cost and inconsistency.

---

## 7. WHAT YOU DO NOT DO (ON PURPOSE)

You do NOT:

- Stream AI responses
- Allow free-form chat
- Let users edit AI output
- Allow regeneration spam
- Blend multiple AI calls

Each of these destroys reliability.

---

## 8. METRICS YOU MUST TRACK

|Metric|Why|
|---|---|
|AI success rate|Reliability|
|Avg analysis time|UX|
|Validation failure rate|Prompt quality|
|Analyses per user|Cost|
|Retry count|Gemini stability|

If asked “how do you monitor AI quality?” — this is your answer.

---

## 9. FINAL AI POSTURE

|Dimension|Status|
|---|---|
|Hallucination control|STRONG|
|Cost predictability|STRONG|
|UX trust|STRONG|
|Interview defensibility|EXCELLENT|

This AI subsystem is **mature enough to defend to senior engineers**.

---

## EXECUTION RULES (READ FIRST)

1. **No feature is “half done.”**  
    If it does not meet acceptance criteria, it does not exist.
2. **Every week ends with something demo-able.**
3. **If a stop condition is hit, you freeze scope.**  
    You fix stability before adding anything.

# PHASE 0 — ENVIRONMENT LOCK (Week 0.5)

### Deliverables

- Firebase project created
- GCP billing enabled
- Firestore in production mode
- Secret Manager configured
- GitHub repo initialized
### Acceptance Criteria

- Firebase CLI deploy works
- Firestore rules deny all by default
- Gemini key stored only in Secret Manager
### Stop Condition

- ❌ If rules allow unauthenticated reads/writes → do not proceed
---

# PHASE 1 — FOUNDATION (Weeks 1–2)

## Week 1: Authentication & Project Skeleton

### Build

- React + TypeScript + Vite
- Firebase Auth (email + Google)
- Protected routes
- Email verification enforcement
### Deliverables

- `/login`, `/signup`, `/verify-email`
- Auth state persisted across reloads
### Acceptance Criteria

- Unverified users cannot access app
- User UID visible in Firestore
- Logout fully clears session
### Stop Condition

- ❌ If auth state desyncs → fix before Week 2

---

## Week 2: Firestore Rules & User Creation

### Build

- Firestore security rules (locked version)
- User document creation on signup
- Settings read/update
### Deliverables

- `/settings` screen
- Rules test cases documented

### Acceptance Criteria

- Users cannot read/write other users’ data
- Malformed writes are rejected
- AI collections are server-only
### Stop Condition

- ❌ If any rule is bypassable → freeze features

---

# PHASE 2 — CORE PRODUCT (Weeks 3–5)

## Week 3: Application CRUD

### Build

- Applications collection
- Create / read / update / delete
- Dashboard + applications list
### Deliverables

- `/dashboard`
- `/applications`
- `/applications/new`

### Acceptance Criteria

- Create application < 10 seconds
- Firestore writes validated
- Empty states present
### Stop Condition

- ❌ If CRUD breaks rules → fix rules, not UI
---

## Week 4: Application Detail & UX Polish

### Build

- `/applications/:id`
- Status updates
- Notes editing
- Resume upload (Cloud Storage)

### Deliverables

- Detail page
- Resume links working
### Acceptance Criteria

- Status changes reflected instantly
- Resume access restricted to owner
### Stop Condition
- ❌ If file access leaks → halt uploads
---

## Week 5: Analytics (Non-AI)

### Build

- Basic counts
- Status breakdown
- Simple charts
### Deliverables

- `/analytics` page
### Acceptance Criteria

- Metrics match Firestore truth
- No BigQuery dependency yet
### Stop Condition

- ❌ If analytics slow UI → simplify

---

# PHASE 3 — AI DIFFERENTIATION (Weeks 6–8)

## Week 6: Gemini Integration (Backend)

### Build

- Cloud Function trigger
- Prompt locked
- JSON validation
- Retry logic
### Deliverables

- AI analysis written to Firestore
- Errors logged, not shown raw
### Acceptance Criteria

- Invalid AI output discarded
- Success rate ≥ 90% in testing
### Stop Condition

- ❌ If hallucinations pass validation → fix prompt
---

## Week 7: AI UX Integration

### Build

- “Analyze Application” CTA
- Loading state
- Result screen

### Deliverables

- `/applications/:id/analyze`
- `/applications/:id/analysis`
### Acceptance Criteria

- Analysis < 10 seconds
- Clear failure messages
- No auto-triggering
### Stop Condition

- ❌ If AI triggers without consent → block release
---

## Week 8: AI Cost & Abuse Controls

### Build

- Per-user quota
- RequestAnalysis flag enforcement
- Caching logic
### Deliverables

- Quota reached UX
- Logged usage metrics
### Acceptance Criteria

- Quota enforced server-side
- Duplicate analyses reused
### Stop Condition

- ❌ If quota bypassable → disable AI temporarily

---

# PHASE 4 — HARDENING (Weeks 9–10)

## Week 9: BigQuery Export & Observability

### Build

- Firestore → BigQuery export
- Structured logging
- Basic dashboards
### Deliverables

- BigQuery tables populated
- Logs searchable by requestId

### Acceptance Criteria

- No PII leaks
- Queries under free tier
### Stop Condition

- ❌ If costs spike → pause exports
---

## Week 10: Data Export & Account Deletion

### Build

- CSV export
- GDPR-style delete
### Deliverables

- Export button
- Delete account flow

### Acceptance Criteria

- Data fully removed    
- Exports accurate

### Stop Condition

- ❌ If deletion incomplete → block release
---

# PHASE 5 — RELEASE & DEFENSE (Weeks 11–12)

## Week 11: Bug Fix & UX Pass

### Build

- Error boundaries - Loading polish - Mobile responsiveness

### Deliverables

- No console errors - Stable flows

### Acceptance Criteria

- Full user journey without crash - AI failure handled gracefully

---

## Week 12: Documentation & Assessment Prep

### Build

- README (architecture + decisions) - Screenshots - Threat model - Cost model
### Deliverables

- Recruiter-ready repo
- Assessment submission ready
### Acceptance Criteria

- You can explain every decision - No “TODO” in main branch

---

# FINAL STOP CONDITIONS (GLOBAL)

If ANY of these occur:

- AI cost spikes - Security rules fail - Core flow breaks → **Freeze features immediately.**

Stability beats novelty.

---
