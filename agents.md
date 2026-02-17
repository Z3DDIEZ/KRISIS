# KRISIS — Agent Rules

Project-specific constraints for AI agents and contributors. Use in addition to [.cursorrules](.cursorrules) (global engineering standards).

---

## 1. Stack and boundaries

- **Frontend:** React 18, TypeScript, Vite. State: Zustand + TanStack Query. Styling: design-system.css (tokens) + Tailwind + SCSS.
- **Backend:** Cloud Functions (2nd Gen, TypeScript), Firebase Auth, Firestore. AI: Gemini 2.5 Flash via `@google/genai` with schema-validated responses.
- **Domain:** No framework imports in domain types; keep Firestore/Gemini behind services.

---

## 2. File and naming

- **Files and directories:** `kebab-case` only (e.g. `application-detail.tsx`, `demo-data-generator.ts`).
- **Components:** `PascalCase` (e.g. `StatCard`, `UrgentActions`).
- **Exports:** Prefer named exports for components and utilities; default export for pages and route components.

---

## 3. Security

- Validate all AI/LLM output (e.g. Zod) before use.
- Enforce auth and tenant isolation in Firestore rules; never trust client-only checks for writes.
- No secrets in repo; use env (Vite `VITE_*`) and Secret Manager for functions.
- Rate limit and quota expensive operations (e.g. Gemini).

---

## 4. Documentation

- Update [docs/AUDIT_ACTION_PLAN.md](docs/AUDIT_ACTION_PLAN.md) when completing audit items or changing priorities.
- Keep [docs/README.md](docs/README.md) in sync when adding or renaming docs.
- README: setup, run, deploy; link to `docs/` for architecture and roadmap.

---

## 5. Production readiness (pre-claiming “done”)

Before marking a feature complete, confirm:

- Null/empty and error paths handled; loading and empty states in UI.
- Auth and Firestore rules cover new collections or fields.
- No `any` or unvalidated external data; Zod (or equivalent) where appropriate.
- Lint and tests pass; CI (`.github/workflows/deploy.yml`) green.

---

## 6. References

- [.cursorrules](.cursorrules) — Global conventions and production checklist.
- [docs/krisis_assessment.md](docs/krisis_assessment.md) — Product/market assessment.
- [docs/AUDIT_ACTION_PLAN.md](docs/AUDIT_ACTION_PLAN.md) — Current priorities and audit log.
- [docs/architecture.md](docs/architecture.md) — GCP/Firebase architecture.
