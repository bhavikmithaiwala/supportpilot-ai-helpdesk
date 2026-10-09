# Codex master prompt — SupportPilot full-stack build

You are implementing **SupportPilot — AI-Assisted Customer Support Platform** in my **already cloned** GitHub repository `bhavikmithaiwala/supportpilot-ai-helpdesk`.

**First, read ALL of these references before coding:**
1. `AGENTS.md`
2. `docs/PROJECT_REFERENCE.md`
3. `docs/COMMIT_ROADMAP.md`
4. `docs/AI_INTEGRATION.md`
5. `docs/ACCEPTANCE_AND_DEMO.md`
6. `docs/INTERVIEW_NOTES.md`

## Deliverable
Build a **real working full-stack app** using Angular + TypeScript frontend, Node.js/Express + TypeScript backend, and MongoDB, plus secure session auth, customer/agent/admin roles, ticket threads, public/private notes, assignment, status lifecycle, explainable rule-based triage, real-time updates, support analytics, optional Gemini reply drafting, tests, documentation, and local development scripts.

The core application MUST work at **zero external AI API cost and without an AI key**. Local deterministic classification and editable response templates are fully functional. The Gemini integration is optional, backend-only, disabled unless explicitly configured and consented to. No AI-generated response should ever send itself.

## Workflow and Git
- Do not create another GitHub repository: it is already created and cloned. Do not run `git init` over the clone. Inspect `git status`, `git branch`, `git remote -v`, and commits first.
- Build in roughly **60 genuine, independently useful incremental commits** according to `docs/COMMIT_ROADMAP.md`. Implement, test and commit each coherent change before starting the next. Never fabricate content, create empty commits, or manipulate Git dates. Use actual timestamps.
- Never force push or rewrite existing history. Preserve all user edits and do not commit credentials, `.env`, real ticket PII or build folders.
- Commit names should be descriptive conventional commits. If a planned step is already complete, do not create a filler commit merely to hit exactly 60; report count accurately.
- Build and test as you progress. Keep `docs/PROGRESS.md` updated with feature status, recent commit hash, tests and blockers. Continue autonomously; ask only for real obstacles such as missing Docker/Node, required permissions or paid external provider setup.
- Implement real persistence and API logic; no fake data in completed dashboards, no placeholder navigation, no hardcoded success messages.
- After completing and verifying everything, safely push to the existing remote if allowed and report what was pushed, tests run and any unresolved gaps.

## Architecture quality
- Keep Angular components and API services modular, with typed models, Reactive Forms, accessible controls, loading and empty states and responsive layout.
- Keep HTTP routes/controllers separate from domain services; validate payloads on server; centralized error handling and consistent API responses.
- Use MongoDB/Mongoose with indexes and pagination; manage ticket lifecycle in a central service and record actor/time history.
- Enforce customer ownership and role restrictions at every API/socket boundary. Internal notes and AI drafts must never reach customer clients.
- Secure sessions with HttpOnly cookies, password hashing, rate limits, CSRF/origin defenses and deliberate CORS credentials rules.
- Authenticated Socket.IO updates must not leak other customers' tickets or private staff notes.
- Keep external Gemini suggestions strictly optional. Only a human pressing Send can create a public message. Validate model outputs and handle timeouts/errors safely.

## Minimum executable demonstrations
1. Customer logs in, creates and replies to a ticket.
2. Agent sees ticket, assigns it, adds an invisible-to-customer internal note, replies publicly, changes status, resolves it.
3. Customer cannot retrieve an unrelated customer's ticket or internal note through REST or WebSocket.
4. Local rule classification + editable template work without API key.
5. Optional cloud draft never auto-sends and degrades gracefully when provider fails.
6. Staff-only analytics shows real ticket counts and calculated times.
7. Automated tests for roles, ownership, lifecycle, socket privacy, fallback and frontend interactions pass.

## Documentation and final report
Provide root README, `.env.example`, architecture and decisions notes, API usage and seed instructions, a demo walkthrough, screenshots if actually captured, and clear deployment guidance. Run backend/frontend build and lint, unit/integration tests and an end-to-end flow in an environment that supports it. Do not claim anything passed if it did not run.

At end report:
- Implemented vs missing features
- Exact new commit count and sample hashes
- Frontend and backend commands
- DB/Docker setup and sample-user provisioning
- Tests/lint/build actual results
- API key requirements (none for local mode)
- GitHub push status
- Known limitations and next steps

**Start implementing immediately, not just planning.** Begin with environment/repository inspection and the first roadmap step. If interrupted, resume from the last confirmed commit and `docs/PROGRESS.md` rather than repeating completed work.
