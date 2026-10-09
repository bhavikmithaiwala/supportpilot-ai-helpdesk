# SupportPilot — Interview Learning Notes

These are study prompts and target explanations. Adapt answers to the code you actually built and tested; don't claim an implementation merely because it appears in this specification.

## 30-second overview
“SupportPilot is a full-stack support-ticket application built using Angular and Node.js, backed by MongoDB. Customers can create and follow tickets; staff can assign, respond, add internal notes, and change status. I focused on server-enforced access control, an audit timeline, and explainable ticket suggestions. An optional AI provider can draft replies, but staff must review and explicitly send them.”

## 12 high-value interview questions and answer directions

### 1. Why Angular and Node.js?
Angular offers structured components, routing, dependency injection, Reactive Forms, and typed API services. Node.js/Express provides REST endpoints and reusable TypeScript business logic. Trade-off: separate frontend/backend builds and auth/CORS coordination.

### 2. Why MongoDB instead of relational SQL?
Support tickets and activity messages are naturally document-like and can grow with flexible metadata. Separate collections for tickets/messages/events keep queries and access checks explicit. Discuss trade-off: cross-document consistency and joins/reporting are more involved than in relational databases; use indexes and careful service-level workflow design.

### 3. How is a customer prevented from reading another ticket?
Session middleware loads authenticated identity. Ticket service filters by customerId for customers before returning records; staff roles have broader access. Check this on list/detail/messages/attachments/socket subscriptions, not merely UI. Test with two customer accounts and the same ticket ID.

### 4. What's the difference between public replies and internal notes?
Message model has validated `visibility`. Public replies are available to the requester and staff; internal notes remain staff-only. Filter on backend serialization and scope WebSocket events. Never expose note contents in customer-facing response payloads.

### 5. How do you stop an AI suggestion from replying automatically?
Suggestions are drafts stored separately from Message. Only a human-triggered `Send` action calls an authorized public-reply endpoint. A model never receives send privileges. Tests assert suggestion alone does not change public messages.

### 6. Can the application work without Gemini?
Yes. A deterministic local rule engine classifies ticket keywords, provides reasons, and generates editable templates. Model integration is optional and falls back for provider errors, quotas, or missing key.

### 7. How do you prevent prompt injection or sensitive data leaks?
Treat ticket text and model output as untrusted. Never execute model-generated instructions; bound and validate JSON/text, render escaped content, do not auto-send. Use explicit consent and minimize/redact data before third-party calls.

### 8. How do ticket statuses work?
Centralize permitted transitions (new->open->waiting_on_customer->resolved->closed, with policy-defined reopening). Reject invalid updates with 409; log actor/time/old/new status in append-only activity.

### 9. What happens when two agents edit the same ticket?
Discuss chosen optimistic conflict strategy/version field or atomic conditional update and how UI refreshes on 409. Avoid claiming conflict-free distributed transactions without implementation evidence. Assignment or status changes must have deterministic final behaviour and audit trail.

### 10. How are real-time updates secured?
Socket.IO authenticates via session cookie and verifies ticket visibility on join, with public/internal event separation. Do not broadcast private notes globally; revoke access on session expiration/logout as designed.

### 11. How are response time metrics calculated?
First response starts at ticket creation and ends at first human agent public reply. Internal notes and AI drafts don't count. Resolution time uses ticket creation and resolution timestamps; define reopen behaviour and test with fixed clocks.

### 12. What would you improve after an MVP?
Production email integration, richer attachment scanning, multi-organization isolation, better analytics, operational monitoring, scalable worker queues. Discuss benefits and why you deliberately avoided premature complexity.

## 7 hands-on questions to answer while examining your actual code
1. Show exactly where backend checks customer ownership and identify a test proving it.
2. Trace `POST /api/tickets` from Angular form -> API route -> validator -> service -> MongoDB -> UI update.
3. Find where a public reply is saved and first-response time is set.
4. Change a simulated ticket to an invalid status and show returned error + unchanged database.
5. Demonstrate that customers can't access internal staff notes through both REST and WebSocket.
6. Unset the Gemini key and show working local triage/draft suggestions.
7. Explain how `docs/PROGRESS.md`, tests, and meaningful commits demonstrate your actual contributions.

## Example resume bullets (ONLY after implemented and tested)
- Built an Angular and Node.js support platform with authenticated customer/agent workflows, role-based REST APIs, MongoDB-backed ticket histories, and real-time updates.
- Implemented explainable ticket categorization and editable reply suggestions with optional AI integration, human approval, and automated tests covering authorization and message privacy.

Never present these as completed until they match the verified code; avoid fabricated speed or accuracy metrics.
