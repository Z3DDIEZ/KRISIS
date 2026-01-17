# GCP Architecture Overview

## Executive Summary

**Product**: AI-Augmented Job Application Intelligence Platform
**Platform**: Google Cloud Platform (100% Google-native stack)
**Architecture Pattern**: Serverless, Event-Driven, Multi-Tenant SaaS
**Target Scale**: 1,000 users, 100,000 applications
**Monthly Budget**: $50-100 (Free tier optimized)

---

## Architecture Overview

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

## Component Architecture (Detailed)

### 1. Frontend Layer

#### Technology Stack
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (JIT compiler)
- **State Management**: TanStack Query + Zustand
- **Firebase SDK**: v10.x (Auth + Firestore)

#### Hosting
- **Service**: Firebase Hosting
- **CDN**: Global edge caching
- **SSL**: Automatic HTTPS
- **Deployment**: GitHub Actions → Firebase CLI

#### Key Features
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

#### Bundle Optimization
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

#### Firebase Authentication Configuration

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

#### Security Rules
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

#### Cloud Functions (2nd Gen)

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

#### Cloud Run Services (Future)

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

#### A. Firestore Database Design

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

#### B. BigQuery Schema

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

#### Gemini API Integration

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

#### Pub/Sub Topics

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

#### Cloud Logging

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

#### Cloud Monitoring Dashboards

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

## Deployment Architecture

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
        cd functions && npm run build

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

## Security Architecture

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

## Scalability Plan

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