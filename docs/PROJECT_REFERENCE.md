# SupportPilot — Full Project Reference

## 1. Identity and goal
**App:** SupportPilot — AI-Assisted Customer Support Platform  
**Repository suggestion:** `supportpilot-ai-helpdesk`  
**Tagline:** Customer support ticket management with explainable triage, real-time updates, and human-reviewed AI reply drafts.  
**Level:** Junior-to-intermediate full-stack portfolio project; deliberately comprehensible, no model training necessary.  
**Core idea:** Customers create support tickets; agents manage conversations and ticket status; admins administer accounts; local rules make suggestions; optional Gemini helps draft replies after user approval.

## 2. What to demonstrate to recruiters
- A real Angular client and a real Express REST API with MongoDB persistence.
- Authentication, 3 role-specific views, backend authorization, and ownership checks.
- A reliable ticket lifecycle, public replies versus private internal notes, assignment, and an immutable activity timeline.
- Real-time notifications with authenticated, permission-checked socket rooms.
- Explainable rule-based categorization/priority plus OPTIONAL model-powered reply drafts, reviewed by a human before sending.
- Measurable first-response time and resolution-time analytics, rather than fake dashboards.
- Tests proving customers cannot read another customer's messages or staff-only notes, and AI drafts cannot auto-send.

## 3. Explicit MVP vs stretch
**Required:** Login/logout; customer create/view/reply; staff ticket list/details/assign/respond/add internal note/status; admin user management; search/filter/sort/pagination; category/priority suggestions; local drafts; real-time ticket updates; dashboard metrics; basic attachments if safely implementable; accessible responsive UI; tests; docs.

**Optional:** Gemini model integration, CSV exports, secure attachments, SLA badges. If provider is unavailable, the complete core workflow must still function with rule-based suggestions. If time is constrained, prioritize ownership/permissions, reply visibility, lifecycle, and tests before secondary dashboard polish.

**Out of scope:** Autonomous emails, unrestricted email inbox ingestion, billing/payments, multiple organizations or tenants, full-blown enterprise SLAs, fine-tuning, embeddings/vector databases, unsupported sentiment accuracy claims.

## 4. Suggested architecture
```text
Angular SPA (customer / agent / admin routes)
  | HttpClient + HttpOnly cookie, WebSocket authenticated session
  v
Express REST API + Socket.IO (same server or coordinated session store)
  |-- Auth middleware -> controller -> service -> Mongoose repositories
  |-- Ticket workflow service -> ticket, message, activity models
  |-- Rules provider -> local classifications and template replies
  |-- Optional Gemini adapter -> validated suggestions only
  v
MongoDB (local docker-compose for development)
```
Single monorepo with `frontend/`, `backend/`, `docs/`, `.github/workflows/`, `docker-compose.yml`, and root `README.md`.

### Project structure
```text
supportpilot-ai-helpdesk/
  frontend/src/app/
    core/{auth,api,guards,interceptors,realtime}/
    shared/{components,pipes,models}/
    features/{login,customer,agent,admin,analytics,settings}/
  backend/src/
    config/ models/ middleware/ validators/ routes/ controllers/
    services/{auth,tickets,messages,triage,analytics,ai}/
    sockets/ tests/ app.ts server.ts
  docs/{PROJECT_REFERENCE,COMMIT_ROADMAP,ACCEPTANCE_AND_DEMO,AI_INTEGRATION,INTERVIEW_NOTES,PROGRESS}.md
  .github/workflows/
  docker-compose.yml
  .env.example
  README.md
```

## 5. Roles and access matrix
| Operation | Customer | Agent | Admin |
|---|---|---|---|
| Create ticket | Own account | Yes | Yes |
| View ticket | Own only | All tickets | All tickets |
| View public customer/agent messages | Own tickets | Yes | Yes |
| View private internal notes | Never | Yes | Yes |
| Add public reply | Own tickets when not closed | Yes | Yes |
| Add internal note | No | Yes | Yes |
| Assign/reassign ticket | No | Yes | Yes |
| Change category/priority/status | No | Yes | Yes |
| Manage users | No | No | Yes |
| View support analytics | No | Yes | Yes |
| Request AI reply draft | No | Yes | Yes |

Security must be enforced in backend routes/services AND in socket subscription handlers. Client-side guards or hidden buttons are insufficient. No ticket-ID enumeration vulnerabilities. Respond with 404 for tickets not visible to customer where appropriate.

## 6. Ticket lifecycle
Statuses: `new`, `open`, `waiting_on_customer`, `resolved`, `closed`.
- Create -> `new`, with requester ID, subject, body, priority/category defaults, createdAt.
- Agent replies or assigns -> may move `new` to `open`.
- Agent can mark `waiting_on_customer`; customer reply may reopen as `open`.
- Agent marks `resolved`; customer can reply to reopen within allowed policy, or agent can reopen.
- Closed is read-only to customers; authorized staff can reopen if necessary, with an audit reason.
- State transitions must be explicitly validated; no arbitrary strings accepted. Document exact accepted transitions and enforce in tests.
- First response timestamp is set only for the first human agent public reply, never an internal note or generated AI draft.
- Resolution timestamp is set on resolve; document behavior if reopened (current-resolution versus first-resolution stats).

## 7. MongoDB models and indexes
**User**: `_id`, `name`, `email` (unique indexed, normalized), `passwordHash`, `role`, `active`, `createdAt`, `updatedAt`. No returned password hashes.

**Session** (or chosen session store): session identifier (hashed when stored if practical), `userId`, `expiresAt`, `revokedAt`, timestamps; TTL index if appropriate. Cookies HttpOnly; Secure in production; SameSite choice matches frontend deployment and CSRF protection. Avoid insecure token storage in browser localStorage.

**Ticket**: `_id`, `ticketNumber` (unique human-readable), `customerId`, `assignedAgentId|null`, `subject`, `description`, `category` (`billing`, `technical`, `account`, `general`, `other`), `priority` (`low`, `medium`, `high`), `status`, `createdAt`, `updatedAt`, `firstRespondedAt|null`, `resolvedAt|null`, `closedAt|null`. Indexed `(customerId,createdAt)`, `(status,priority,updatedAt)`, `(assignedAgentId,status)`.

**Message**: `_id`, `ticketId`, `authorId`, `body`, `visibility` (`public` or `internal`), `source` (`human` only for sent messages), `createdAt`. Index `(ticketId,createdAt)`. AI suggestions are NOT sent messages.

**TicketEvent**: `_id`, `ticketId`, `actorId`, `type`, `before`, `after`, `metadata`, `createdAt`. Append-only through app; not freely user-editable. Index `(ticketId,createdAt)`.

**AIDraft / SuggestedAction** (optional): ticketId, requestedBy, draftText, provider (`local`/`gemini`), category/priority suggestions, explanation/rules, review status, createdAt; no automatic outbound sending. Apply retention policy, don't store raw sensitive model prompt unnecessarily.

**Attachment** (stretch): ticketId, messageId, storageKey, sanitizedName, safeMimeType, size, createdBy, createdAt. Store outside public web root, authenticated download, allowed types and strict max size; scan when available, otherwise restrict types and describe limitation.

## 8. API contract (suggested)
Return consistent `{data, error, pagination?}` structure. Appropriate HTTP status codes: 400 invalid input, 401 unauthenticated, 403 forbidden, 404 hidden/not found, 409 invalid transition/conflict, 429 rate limited, 5xx unexpected. Validate query inputs and object IDs.

Authentication: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`.

Customer: `POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/messages` (public customer message only).

Agent/admin: `PATCH /api/tickets/:id` (category/priority/status/assignment via validated commands), `POST /api/tickets/:id/assign`, `POST /api/tickets/:id/status`, `POST /api/tickets/:id/notes`, `POST /api/tickets/:id/replies`, `GET /api/tickets/:id/events`.

AI: `POST /api/tickets/:id/suggestions` (rules and templates; optional Gemini draft if enabled and consented), `POST /api/tickets/:id/suggestions/:draftId/approve` (explicit agent review action; approval alone should not send unless the UI explicitly confirms Send), `POST /api/tickets/:id/suggestions/:draftId/reject`.

Analytics: `GET /api/analytics/summary`, `GET /api/analytics/trends?from=&to=`; staff/admin only.

Admin: `GET /api/users`, `POST /api/users`, `PATCH /api/users/:id` for staff provisioning/status; safe initial-admin seed process.

Attachments stretch: `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id` with authz and validation.

Pagination: stable cursor or offset + limit with server-side caps, deterministic ordering.

## 9. Business workflows
### Customer raises billing ticket
1. Customer signs in, enters subject and description; Angular validates, backend validates again.
2. Backend creates ticket + initial public message/event in consistent flow.
3. Customer is redirected to own ticket; staff see new ticket in inbox.
4. Local rules identify category `billing` and optionally urgency cues, explaining *which rules fired*, not claiming calibrated probabilities.
5. Agent chooses assignment, sends a human reply, timeline records who/when/status change.

### Agent asks customer for information
1. Agent creates public reply, selects `waiting_on_customer`.
2. Customer receives in-app notification and can reply.
3. Customer reply moves ticket to `open` per policy and notifies assigned agent.
4. Agent resolves after a real reply. Analytics updates from timestamps.

### Internal note privacy
Agent adds `internal` note with troubleshooting details; only agent/admin API responses and socket events reveal it. Customer must not see it via list, detail, search, exports, or websocket.

### AI draft review
Agent clicks Suggest Reply, sees recommendation + why, edits it, then explicitly clicks Send. Suggestions never appear as sent messages unless a separate authorized send endpoint succeeds. No model can invoke send tools directly.

## 10. Local/demo credentials and sample data
Seed 1 admin, 2 agents, 3 customers, 12 fictional tickets with various statuses, priorities, messages, notes, and activity. Prefer credentials provided through local environment or a seed script that prints generated **local-only** passwords. Never use these as public hosted credentials or commit a working secret. Demo scenario should use a safe resettable local database.

## 11. UI design
Professional neutral layout, sidebar, quick filtering, responsive ticket inbox/detail split view. Customer: My tickets, New ticket, ticket conversation, profile. Agent: Inbox, Assigned to me, Unassigned, ticket details, public reply/internal note tabs, suggested category/priority, suggested reply, analytics. Admin: Users/roles and general settings. Visible status, keyboard focus, busy/error/empty states, no fake dashboard counts. Use Angular Reactive Forms, typed services, RxJS cleanup, accessible notification toasts and dialogs.

## 12. Security and reliability
- Rate-limit login and AI suggestions; strong input bounds; safely render text (no arbitrary HTML from customers or LLM).
- Strict route ownership and visibility tests; never rely on client-supplied role/customerId; derive from authenticated session.
- Socket handshake session auth, room permission checks, unsubscribe on logout, no broadcast of private notes to customer rooms.
- Model-generated content is untrusted; validate structured data, don't execute instructions, don't publish model outputs automatically.
- HTTPS required in deployed environment; sanitize logs; don't use real customer PII in demo data.
- If running cross-origin cookie sessions, configure CORS credentials and CSRF consistently; don't broadly allow all origins.
- MongoDB connection failures, input errors, invalid ticket state transitions, expired sessions, timeouts, and duplicate submissions must have predictable behavior.

## 13. Tests and acceptance
See `docs/ACCEPTANCE_AND_DEMO.md` for exact expected results; must include multi-user privacy and rule/AI fallback tests. Backend unit+integration via Vitest/Supertest and deterministic Mongo test setup; Angular component/service tests; Playwright smoke journey for customer + agent + admin if feasible. Report genuine pass/fail output.

## 14. What is a good portfolio result?
A recruiter should be able to read the README, run Docker for Mongo, start frontend and backend, sign in with development fixtures, reproduce a ticket lifecycle, see real analytics, and inspect tests for permissions. Provide a short architecture diagram, a 60–90 second screen recording or screenshots, an API reference, and an `ENGINEERING_DECISIONS.md` with 4–6 decisions/trade-offs. Avoid unverified performance percentages or claims of production security.
