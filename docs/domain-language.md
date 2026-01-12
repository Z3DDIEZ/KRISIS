# KRISIS Domain Language

This document defines the canonical domain language for **KRISIS**.

All user-facing terminology, internal models, database schemas, and service interfaces must derive from this vocabulary. Consistency is mandatory; introducing new terms without mapping them to this document is considered a design error.

---

## 1. System Definition

### **KRISIS**

The system itself.

KRISIS is a **decision intelligence platform** that evaluates job application alignment using structured data and constrained AI.

Constraints:

* KRISIS does not predict outcomes.
* KRISIS does not make decisions.
* KRISIS provides structured signals to support human judgment.

The system must never be anthropomorphized (e.g. “Krisis thinks”).

---

## 2. Core Domain Objects

### **Application**

A single job application submitted by a user.

Represents:

* A specific role at a specific company
* A snapshot of candidate information
* A current application state

The Application is the **primary aggregate root** in the system.

---

### **Role Profile**

A structured representation of the job description associated with an Application.

Includes:

* Required skills
* Preferred skills
* Seniority level
* Role keywords

Role Profiles may be user-entered or extracted, but are never inferred implicitly.

---

### **Candidate Profile**

A structured snapshot of the applicant at the time of application.

Includes:

* Resume content
* Declared skills
* Experience signals

Candidate Profiles are implicitly versioned by being bound to an Application rather than stored globally.

---

## 3. Decision Intelligence Concepts

### **Krisis Analysis**

An immutable, AI-generated evaluation of an Application.

Rules:

* Generated only via explicit user request
* Written server-side only
* Never edited or recomputed automatically

A Krisis Analysis is not feedback or advice; it is an evaluation artifact.

---

### **Krisis Score**

A normalized numeric indicator (e.g. 0–100) representing alignment between the Candidate Profile and Role Profile.

Constraints:

* Always contextual
* Never predictive of hiring outcome
* Never absolute

Correct framing:

> The Krisis Score indicates alignment, not likelihood.

---

### **Signals**

Discrete, explainable factors contributing to a Krisis Analysis.

Examples:

* Skill overlap
* Missing requirements
* Experience mismatch
* Keyword alignment

Signals are descriptive and explanatory, not prescriptive.

---

### **Gaps**

Identified deficiencies between the Candidate Profile and Role Profile.

Constraints:

* Gaps describe misalignment
* Gaps do not guarantee rejection
* Gaps do not imply obligation to act

---

### **Recommendations**

Optional, bounded suggestions derived from identified Gaps.

Rules:

* Concrete and limited in number
* Never open-ended
* Never framed as guarantees

---

## 4. System Control Terms (Internal)

### **Analysis Request**

A user-initiated action that authorizes AI execution for a specific Application.

This term must be used consistently in code and documentation.

---

### **Quota**

A hard, server-enforced limit on the number of Krisis Analyses a user may request.

Note:

* Quota is a control mechanism, not a billing construct.
* The term “credits” is intentionally avoided at the system level.

---

### **Immutable Record**

Any data object that cannot be modified once written.

Applies to:

* Krisis Analyses
* Historical application snapshots

Immutability is enforced at the database rule and service layer.

---

## 5. Prohibited Language

The following terms must not be used anywhere in the system:

* Prediction
* Probability
* Chance
* Hiring likelihood
* Success rate

These concepts are intentionally excluded to avoid misleading users and to preserve system credibility.

---

## 6. Design Principle

KRISIS is designed to:

* Surface clarity
* Preserve user agency
* Constrain automation
* Favor explainability over optimization

Any feature or term that violates these principles should be rejected or redesigned.
