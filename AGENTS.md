# SupportPilot — Instructions for coding agents

Read `docs/PROJECT_REFERENCE.md`, `docs/COMMIT_ROADMAP.md`, `docs/ACCEPTANCE_AND_DEMO.md`, `docs/AI_INTEGRATION.md`, and `docs/INTERVIEW_NOTES.md` before implementation.

## Mission
Build a working, understandable, full-stack AI-*assisted* customer support platform for a junior developer portfolio. Do not deliver a demo-only UI, fake backend, or nonfunctional features. No external provider is required for core functionality.

## Existing repo and Git
- The user has already created the GitHub repository and cloned it. Inspect `git remote -v`, `git status`, `git branch --show-current`, and recent history. **Do not create another GitHub repository or reinitialize the existing one.**
- Keep existing unrelated content and uncommitted user changes intact; ask before modifying conflicting work.
- Implement, verify, and commit coherent increments. Aim for the **60-step roadmap**, never empty/meaningless commits. Real development dates only; no timestamp fabrication or history rewriting.
- Stage only intended files, run appropriate checks and review the diff. Preserve authored work. Never use `git push --force`.
- Push to `origin/main` only when authenticated, authorized, and fast-forward safe; otherwise give the user steps. Do not create paid resources without approval.
- Never commit `.env`, access tokens, database credentials, email addresses of real users, or personal support data. Use `.env.example` placeholders.

## Technical choices
- Frontend: **Angular + TypeScript**, standalone components, Router, HttpClient, Reactive Forms, RxJS, CSS/SCSS. Use feature folders and accessible controls.
- Backend: **Node.js + TypeScript + Express**, Mongoose, MongoDB. Controllers contain HTTP plumbing; services contain business rules; middleware enforces authorization.
- Auth: hashed passwords, HttpOnly cookie sessions, secure defaults, session invalidation, CSRF/origin defenses, login throttling, role-aware server checks.
- Roles: `customer`, `agent`, `admin`. Customer can only access own tickets and public messages. Agent can access workspace tickets and internal notes. Admin additionally manages users and settings.
- Real-time: Socket.IO with session-authenticated, correctly scoped event delivery. No unauthorized ticket contents in broadcasts.
- AI: deterministic, key-free rules and template drafts MUST work. Optional Gemini provider called on backend only after user-enabled consent and with privacy safeguards; **AI may draft but never auto-send**. Validate all model output.
- Data: use real MongoDB persistence, indexes, pagination, type-safe validation, and audit events for ticket changes. Do not advertise unsupported or unverified functionality.

## Quality gates
- Each major phase must build and pass its targeted tests before proceeding; at final release run frontend build, backend build, lint, API integration tests, UI tests, and a real browser end-to-end workflow when environment allows.
- No false test reports. Record environment failures and exact commands needed to reproduce.
- Build responsive desktop/mobile UI; keyboard access, labels, focus states, loading/empty/error states.
- Add seed data with fictional accounts and sample tickets only. Demo passwords should be generated/configured securely and never placed as active production secrets.
- Keep `docs/PROGRESS.md` with completed tasks, commit IDs, test commands/results, outstanding blockers, and next task after each milestone.
- Explain implementation decisions and trade-offs in docs as they are made, so the author can defend them in an interview.

## Scope discipline
- No microservices, Kubernetes, vector database, autonomous agents, or mandatory paid AI integrations.
- Avoid oversized abstractions. Prioritize security, correct authorization, ticket lifecycle consistency, and reliable tests over superficial features or an exact commit count.
