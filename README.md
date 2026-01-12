# KRISIS

Decision intelligence for job applications.

**KRISIS** is a Google-native decision intelligence platform for job applications. 
It helps job seekers evaluate role alignment, identify gaps, and decide what to do next — using structured data and constrained, cost-aware AI.
orm.

*MVP in active development.*
---

## Overview

**KRISIS** is a production-ready MVP built entirely on **Google Cloud Platform**. It enables users to track job applications and receive **structured AI feedback** on resume–role alignment, without hallucinations, uncontrolled costs, or opaque automation.

This project was intentionally designed as a **defensible SaaS system**, not an AI demo.
---

## Problem Statement
Job seekers often apply to dozens of roles with little feedback, visibility, or insight into:

- Which applications are competitive
- Why certain applications fail
- What concrete actions to take next

Most tools stop at tracking.  
KRISIS adds **explainable, constrained AI evaluation** on top of structured application data.

---

## Core Features (MVP)

### Application Tracking
- Create, update, and manage job applications
- Track status (Applied, Interview, Rejected, Offer)
- Attach resumes and notes
- Real-time synchronization via Firestore

### AI Application Analysis (User-Initiated)

- Resume–role fit score (0–100)
- Matching skills
- Identified gaps
- Concrete next steps

> AI analysis is **explicitly user-triggered**, rate-limited, schema-validated, and cached to ensure trust and cost predictability.

### Analytics

- Application counts and status breakdown
- Weekly application velocity
- Fit score distribution
### Data Control

- CSV export
- Full account deletion (GDPR-style)
---

## 🏗️ Architecture

**Architecture Pattern:**  
Serverless · Event-Driven · Multi-Tenant SaaS

### Frontend

- React + TypeScript (Vite)    
- Firebase Hosting (global CDN)
- Firebase Auth (Email + Google OAuth)
### Backend

- Cloud Functions (2nd Gen)
- Firestore (primary datastore)
- Cloud Storage (resume uploads)
- Gemini API (AI analysis)

### Analytics & Observability

- BigQuery (event analytics)
- Cloud Logging & Monitoring
- Structured logs with correlation IDs

> No always-on servers. No vendor lock-in beyond GCP primitives.

---

## 🔐 Security Model

Security is enforced at the **database boundary**, not the UI.

- Strict Firestore rules ensure tenant isolation
- Users can only read/write their own data
- AI analysis and analytics collections are **server-only**
- Immutable fields prevent replay and abuse
- Secrets stored in Google Secret Manager

A full threat model and rule test cases are documented in the repository.

---

## 🤖 AI Reliability & Trust

This system treats AI as **untrusted input**.

Controls in place:

- Single locked prompt    
- JSON-only responses
- Strict schema validation
- Retry with hard failure limits
- Per-user quotas
- Cached results to reduce cost and variance
    

If AI output does not meet validation criteria, it is discarded.

---

## 💰 Cost Awareness

Designed to operate comfortably within free tiers.

|Service|Cost Strategy|
|---|---|
|Firebase Hosting|CDN, free tier|
|Firestore|Minimal reads/writes|
|Cloud Functions|Event-driven only|
|Gemini API|Quota-limited, cached|
|BigQuery|Write-only, partitioned|

Estimated MVP cost: **$10–15/month**

---

## 📈 Scalability Plan

- **0–1K users:** Current architecture
- **1K–10K users:** Introduce Cloud Run API layer
- **10K+ users:** Batch BigQuery ingestion, multi-region
    

Scalability decisions are deferred intentionally until metrics justify them.

---

## 🧪 Testing & Validation

- Firestore rules tested against common attack scenarios
- AI schema validation enforced server-side
- Manual QA against all MVP user flows
- Error states handled explicitly in UX
    

---

## 🚫 Non-Goals (By Design)

This MVP does NOT:

- Guarantee hiring outcomes
- Replace career coaching
- Auto-optimize resumes
- Provide recruiter features
- Use conversational AI

These constraints are intentional.

---

## 🧭 Project Status

**Status:** MVP in development 
**Next Iterations (Post-MVP):**

- Cover letter generation
- Interview preparation
- Paid tiers
- Organization views

---

## 👤 Author

**Zawadi M C Nyachiya**  
 Software Developer · Systems-Oriented Engineer 
 
Built as an independent SaaS project to demonstrate production-grade system design, cloud architecture, and applied AI reliability.
 
Johannesburg, South Africa

GitHub: [https://github.com/Z3DDIEZ](https://github.com/Z3DDIEZ)

---
