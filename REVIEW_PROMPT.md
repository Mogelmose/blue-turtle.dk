# Blue Turtle Review Brief + Prompt

## 1) Project Structure (from `AGENTS.md`)
- Repo root is documentation only.
- Application code lives in `blue-turtle-webapp/`.
- Main folders:
  - `blue-turtle-webapp/src/app/` - App Router pages + route handlers
  - `blue-turtle-webapp/src/components/` - UI + feature components
  - `blue-turtle-webapp/src/lib/` - shared auth/prisma/validation/storage/metadata logic
  - `blue-turtle-webapp/prisma/` - schema + migrations + seed
  - `blue-turtle-webapp/public/` - static assets only (no private uploads)

## 2) Mandatory Guidelines (from `AGENTS.md`)
- Auth model:
  - Admin: unrestricted, admin page access, album delete allowed.
  - Regular: authenticated access to all other operations, but no admin page and no album delete.
- Storage/security:
  - Private uploads must not be placed in `public/`.
  - DB stores relative paths only (relative to `UPLOAD_ROOT`).
  - All file path resolution must be safe (`path.resolve` + root-prefix validation).
  - Never trust client file paths; always resolve by DB record.
- Upload constraints:
  - Allowed mime list is fixed.
  - Per-file max size: `50 * 1024 * 1024`.
  - Validate at server boundary (client-side checks are UX only).
- Media serving:
  - Protected route handlers required for originals/covers/avatars.
  - Video endpoints must support HTTP Range (`206`, `Accept-Ranges`, no full buffering).
- Background jobs:
  - DB-backed queue with retry/status handling.
  - Upload flow must not block on metadata extraction.
- Coding/refactor expectations:
  - Prefer incremental, reviewable changes.
  - TS-first (`.ts/.tsx`), avoid `any`, validate boundaries.
  - Tailwind-first styling and existing tokens/pattern reuse.

## 3) Comprehensive Review Prompt (copy/paste)
```text
You are a senior code reviewer. Review this repository comprehensively, with a strict security + correctness focus, and produce actionable findings.

Repository context:
- Project: Blue Turtle (private multi-user photo/video sharing app).
- Stack: Next.js App Router, React, Prisma, PostgreSQL, NextAuth, Tailwind.
- Code root: blue-turtle-webapp/.
- Treat AGENTS.md as authoritative requirements.

Critical requirements from AGENTS.md to verify:
1. Permissions:
   - Admin-only: admin page access and album deletion.
   - Regular users can do everything else once authenticated.
2. Storage:
   - No private uploads in public/.
   - DB stores relative upload paths only.
   - File system path traversal protections are mandatory.
3. Upload rules:
   - Enforce allowed mime types and 50MB max server-side.
4. Protected serving:
   - Originals/covers/avatars are protected.
   - Video supports Range requests correctly (206, headers, streaming).
5. Metadata/jobs:
   - Upload path should not block on metadata extraction.
   - Job processing flow is resilient (status, retry, failure handling).
6. Error handling:
   - Detailed server logs, generic client errors, no secret/path leakage.

Review scope (deep):
- Security/authorization gaps.
- Data integrity and filesystem safety.
- Behavioral regressions and edge cases.
- Duplication and maintainability risks.
- Type-safety issues (`any`, JS/TS inconsistencies, weak boundary validation).
- Performance hotspots (N+1 queries, heavy polling, unnecessary DB roundtrips, stream handling).
- API consistency (status codes, error shapes, auth handling).

Important instructions:
- Do not just restate style issues.
- Prioritize bugs, vulnerabilities, and logic flaws over aesthetics.
- Cite exact file paths and line numbers for each finding.
- For each finding include:
  - Severity: Critical / High / Medium / Low
  - Why it matters
  - Reproduction or failure scenario
  - Minimal fix recommendation
- Call out duplicated code blocks that should be extracted.
- Identify missing tests and propose concrete test cases.
- If uncertain, state assumptions explicitly and ask clarifying questions.

Output format:
1. Findings (ordered by severity, most important first)
2. Open Questions / Assumptions
3. Suggested Refactor Plan (small, incremental PR-sized steps)
4. Test Plan (manual + automated)
5. Quick Wins (high impact, low effort)

Also run these checks if available and include noteworthy output:
- bun run lint
- Type checking/build checks relevant to this repo

Be strict, specific, and practical.
```

## 4) Suggested Clarification Questions
- Should avatars be private to authenticated users only, or intentionally viewable by anyone who knows the URL?
- Are legacy public profile images (`/public/uploads/profile/...`) still allowed temporarily, or should they be fully migrated to `UPLOAD_ROOT` now?
- Do you want the reviewer to include schema/migration health checks (e.g., migration idempotency and production-safe migration strategy) as part of this pass?
