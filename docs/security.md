# KRISIS Security Model

This document defines the security, trust boundaries, and enforcement strategy for **KRISIS**.

KRISIS assumes a **hostile client environment** and enforces all guarantees at the database and backend service boundary.

---

## 1. Core Security Principles

1. **The frontend is untrusted**

   * All client-side code can be bypassed or modified.
   * SDK calls can be scripted directly against Firebase APIs.

2. **Authorization is enforced at the data boundary**

   * Firebase Authentication provides identity only.
   * Firestore Security Rules provide authorization.

3. **AI output is untrusted input**

   * No AI-generated data is trusted by default.
   * All AI output must be validated, gated, and constrained server-side.

4. **Immutability over convenience**

   * Decision artifacts are immutable once written.
   * Auditability and trust take precedence over flexibility.

---

## 2. Trust Boundaries

KRISIS enforces a strict separation between:

* **Client Boundary (Untrusted)**
  * Browser-based frontend
  * Any direct Firestore or Storage SDK usage
* **Service Boundary (Trusted)**
  * Cloud Functions using Admin SDK
  * Scheduled and triggered backend services

Only services operating within the trusted boundary may perform privileged actions.

---

## 3. Client-Writeable Entities

Authenticated clients are allowed to create and mutate the following **user-owned entities**:

* Applications
* Role Profiles (scoped to an Application)
* Candidate Profiles (scoped to an Application)
* User Settings

Constraints enforced via Firestore rules:

* Writes must be scoped to `request.auth.uid`
* Ownership fields are immutable
* Schema validation is enforced using allowlisted fields
* Cross-user reads and writes are rejected

---

## 4. Server-Only Write Entities

The following **system-owned entities** may only be written by backend services:

* Krisis Analyses
* Signals
* Gaps
* Recommendations
* AI usage / quota records
* Analytics aggregates

Rules:

* Client write access is explicitly denied
* Reads are limited to the owning user where applicable

---

## 5. AI as Untrusted Input (Explicit Enforcement)

KRISIS treats all AI output as untrusted input.

### Enforcement Points

1. **Invocation Control**
   * Only backend services may invoke the Gemini API
   * No client-side AI calls are permitted

2. **Schema Validation**
   * AI output must conform to a strict JSON schema
   * Invalid or partial responses are discarded

3. **Immutability Enforcement**
   * Valid AI output is written as immutable records
   * Records cannot be modified, regenerated, or merged automatically

4. **Quota & Intent Gating**
   * AI execution requires an explicit Analysis Request
   * Per-user quotas are enforced server-side

---

## 6. Failure Handling

If AI execution fails:

* No partial data is written
* The failure is logged with correlation identifiers
* The user receives a controlled, non-technical error state

The core application remains fully usable without AI availability.

---

## 7. Storage Security

* Resume uploads are scoped per user
* Access is restricted to the owning user
* No public file access is permitted
* File metadata is validated server-side where applicable

---

## 8. Logging & Auditability

* All privileged actions are logged
* AI execution includes request and response metadata (excluding PII)
* Logs are structured for traceability and debugging

---

## 9. Security Posture Statement

KRISIS prioritizes:

* Explicit ownership
* Minimal write permissions
* Server-side enforcement
* Transparency over automation

Any feature requiring relaxed security constraints must be rejected or redesigned.
