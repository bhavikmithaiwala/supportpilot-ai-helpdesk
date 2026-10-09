# SupportPilot — Acceptance Criteria, Test Matrix, and Demo

## Must-pass functional journeys
### A. Customer creates and follows a ticket
1. Sign in as demo customer `customer1` with locally configured credentials.
2. Submit a billing question (title + description, limits enforced); ticket appears in My Tickets and staff Inbox.
3. The customer sees ticket ID, public messages, status, creation timestamp. Cannot see internal staff notes.
4. Add a reply; assigned agent sees it via refresh or scoped realtime update; state changes as documented.
5. Attempt to open a second customer's ticket by copied ID: must fail without revealing metadata.

### B. Staff handles a ticket
1. Log in as agent. View only capabilities permitted to agent.
2. Assign ticket, update category/priority, add internal note, send public reply, mark waiting-on-customer, then resolve.
3. Confirm event timeline records actor, action, time and old/new values.
4. Customer sees public reply and status, but no internal note or staff-only event metadata.
5. `firstRespondedAt` records first human public response, not internal note or suggested reply.

### C. Admin manages users
1. Admin provisions staff account. Agent cannot use users API.
2. Deactivate staff account and verify future authenticated access stops or is appropriately revoked.
3. Customer cannot escalate privileges via API payload or fake frontend role.

### D. AI drafts never send themselves
1. Run with NO AI key. Local classification and template draft are available.
2. Agent requests draft, previews and edits. No public message created yet.
3. Agent clicks explicit Send and only then sees public message and a send event.
4. Simulate Gemini failure/invalid output; no message is sent, fallback shown.
5. Customer cannot invoke staff suggestion API, nor see a private draft.
6. If enabling external provider, require explicit agent opt-in/consent and show what information is shared.

### E. Real-time and privacy
1. In two browser profiles, log in as customer and agent for same ticket; add agent public reply and verify update.
2. Add internal note: customer must receive no private content via REST or WebSocket.
3. Log in as unrelated customer; cannot join room, read ticket details, or receive events.
4. Logout/revoke session and verify socket access stops on reconnect / protected requests.

### F. Analytics and export
1. Seed known ticket/message timestamps. Verify status totals match DB.
2. `first-response` excludes internal notes and AI drafts; `resolution` tracks documented rule for reopened tickets.
3. Customers cannot download staff reports, and staff reports exclude forbidden private details if appropriate.
4. CSV output escapes quotes, line breaks and leading formula characters.

## Negative scenarios
- Empty/oversized subject; missing description; HTML/script text; malformed ObjectId; invalid status transition; duplicate requests; nonexistent user assignment; expired session; inactive staff; loss of MongoDB connectivity; failed socket authentication.
- Empty ticket inbox; slow API; no network; no AI key; denied AI consent; AI 429/timeout; invalid model response; long/unexpected Unicode input.
- Attachments: unsupported format, oversized upload, unsafe filename, ticket ownership denied, direct link without authentication.

## Tests to implement
| Layer | What must be verified |
| --- | --- |
| Backend unit | Status transitions, rule engine, suggested priority, first response and resolution calculations |
| Backend integration | Real auth cookie, customer ownership, admin-only users, visibility of internal notes, DB event persistence |
| Socket integration | Session auth, room permissions, public vs internal event access, logout/session expiry |
| AI mock integration | No-key fallback, explicit opt-in, invalid JSON, timeouts, unsent drafts |
| Angular component | Login validation, ticket composer, status/assignment controls, note visibility, loading errors |
| End-to-end | Customer creates -> agent assigns/replies -> customer responds -> agent resolves; admin creates agent |

Prefer Vitest + Supertest for backend, Angular's supported test runner for Angular, and Playwright for browser E2E. Use a deterministic ephemeral MongoDB test database; never point tests at production. Only report a test as passed after actually running it.

## Demo video plan (90–120 seconds)
00–15s: Login customer, create ticket.  
15–35s: Login agent, see ticket in inbox, show classification suggestions and explanation.  
35–55s: Assign and add an *internal* note; show it hidden from customer.  
55–75s: Ask for an editable reply draft; manually send.  
75–90s: Show real-time customer update, close/resolve ticket.  
90–120s: Analytics page; briefly show tests and README engineering decisions.

Use only fictional support data in recordings, not private messages or keys.

## README proof checklist
- Working local setup (`docker compose up -d`, `npm install`, app/backend commands) and prerequisites.
- Database schema and API examples, accurate authentication/cookie notes.
- Role permission matrix and ticket state diagram.
- Screenshots, demo video link if available, and test commands/output.
- Engineering notes for visibility, activity timeline, AI consent, fallback, socket authorization.
- Clear status of all incomplete features; no fabricated performance numbers.
