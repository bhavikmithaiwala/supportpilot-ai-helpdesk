# SupportPilot — 60-Commit Implementation Roadmap

Target: **60 meaningful incremental commits**. These are planned logical changes, NOT instructions to generate empty commits. Build a feature, verify it, stage the relevant files, commit it with actual current timestamps. Some steps may need combining or splitting because of dependencies; correctness wins over a numeric target. Never falsify chronology, make an empty commit, or rewrite existing Git history. Keep `docs/PROGRESS.md` updated.

## Phase 1 — Foundation and Angular UI (1–8)
1. `chore: initialize Angular and Express monorepo` — root scripts, folders, README placeholder, .gitignore
2. `chore: scaffold Angular application with routing` — standalone Angular build and dev scripts
3. `chore: scaffold Express TypeScript service` — strict tsconfig, app/server separation, health endpoint
4. `chore: configure MongoDB Docker development service` — compose, env example, DB connection
5. `chore: add formatting lint and shared dev scripts` — reproducible lint/build scripts
6. `feat: create Angular app shell and navigation` — customer/agent/admin navigation shell
7. `feat: implement responsive UI design primitives` — forms, buttons, panels, mobile nav
8. `feat: add accessible loading error and empty states` — status UI and global errors

## Phase 2 — Identity, Sessions, and Permissions (9–17)
9. `feat: define user model role types and indexes` — user schema and normalized unique email
10. `feat: add validated password hashing utilities` — password policy, safe hashing and comparisons
11. `feat: implement server-side cookie sessions` — secure cookies, session storage, logout invalidation
12. `feat: add login logout and current-user APIs` — validation and stable error responses
13. `feat: enforce server-side role authorization` — customer, agent, admin role middleware
14. `feat: create safe initial-admin bootstrap workflow` — admin provisioning via env, no committed password
15. `feat: build Angular login and session screens` — reactive forms and error messages
16. `feat: wire Angular auth services and guards` — interceptors, guards, logged-in identity
17. `test: cover auth expiry and role boundaries` — API tests for unauthorized/forbidden/revoked

## Phase 3 — Ticket CRUD and Staff/Customer Workflows (18–30)
18. `feat: define ticket schema statuses and indexes` — ownership, assignment, category, priority, timestamps
19. `feat: define public and internal message schema` — message visibility model and validations
20. `feat: add append-only ticket activity records` — audit events for changes
21. `feat: implement customer ticket creation API` — authenticated validation and initial public message
22. `feat: add role-scoped ticket list API` — pagination, filtering, customer ownership
23. `feat: implement ticket details API with visibility rules` — own-ticket and internal-note protections
24. `feat: validate ticket state transitions` — central lifecycle service and conflict responses
25. `feat: implement staff assignment endpoints` — agent matching, who/when events
26. `feat: add ticket priority and category changes` — validated staff updates with history
27. `feat: create customer new-ticket form` — validation and success state
28. `feat: create customer ticket inbox and conversation` — list/detail/replies
29. `feat: create staff ticket inbox and filters` — assigned/unassigned, search, priorities
30. `feat: implement staff ticket replies and internal notes` — separate controls and verified privacy

## Phase 4 — Coordination and Local Triage (31–39)
31. `feat: add ticket assignment and status controls in Angular` — staff actions with error handling
32. `feat: show ticket audit timeline in details` — human-readable status/assignment changes
33. `feat: record first agent response and resolution times` — accurate timestamps, no AI drafts
34. `feat: authenticate realtime socket connections` — session-integrated Socket.IO
35. `feat: scope socket subscriptions to authorized tickets` — no cross-user/private leaks
36. `feat: broadcast scoped ticket changes and new messages` — reconnect-safe refresh behavior
37. `feat: implement in-app unread indicators` — unread and notification UI with backend state
38. `feat: add overdue response indicators` — simple documented threshold policy
39. `feat: implement explainable local ticket triage` — category and priority suggestions, rules tested

## Phase 5 — Human-in-the-Loop AI (40–47)
40. `feat: show triage suggestions with human overrides` — explanation UI and accept/reject
41. `refactor: introduce interchangeable reply suggestion providers` — local/provider interface
42. `feat: implement key-free support reply templates` — editable local drafts
43. `feat: integrate optional backend Gemini draft provider` — opt-in env, SDK, errors and timeouts
44. `feat: add consent and PII minimization for AI prompts` — no silent external transmission
45. `feat: validate and sanitize structured AI output` — schema, length, safe rendering
46. `feat: implement agent-reviewed draft and send workflow` — separate draft vs actual public message
47. `test: ensure AI never auto-sends and falls back safely` — malformed, timeout, no key, permission tests

## Phase 6 — Analytics, Exports, and Attachments (48–53)
48. `feat: aggregate ticket totals categories and trends` — real MongoDB data, staff-only
49. `feat: calculate first response resolution and backlog metrics` — documented calculation semantics
50. `feat: create support analytics dashboard charts` — date filtering and clear empty states
51. `feat: export scoped ticket reports to safe CSV` — prevent formula injection, permissions
52. `feat: store and authorize limited ticket attachments` — size/type checks, private download
53. `feat: create attachment upload and preview interface` — error and mobile handling

## Phase 7 — Testing, Documentation, Release (54–60)
54. `test: verify ticket ownership and note privacy across roles` — customer API + WebSocket isolation
55. `test: cover ticket lifecycle and activity history` — transitions, errors, event consistency
56. `test: validate local triage classification and edge cases` — false positives and overlapping cues
57. `test: add Angular workflow and interaction tests` — login, ticket form, reply, statuses
58. `test: add end-to-end customer and agent journeys` — Playwright, real test backend/database
59. `chore: configure CI for lint build and tests` — GitHub Actions and seed/test instructions
60. `docs: finalize API reference architecture README and demo` — actual screenshots, known limits, verified runbook

## Development process per step
1. Inspect current code and relevant acceptance criteria.
2. Implement small complete feature and update tests.
3. Run targeted tests/build/lint (and all tests at phase boundaries).
4. Review Git diff for unrelated content or secrets.
5. Stage relevant files and commit using proposed message adjusted to actual change.
6. Update `docs/PROGRESS.md`; mark incomplete steps transparently.
7. At completion verify working tree, full tests, README and exact commit count; safe push only if remote is fast-forward-compatible.
