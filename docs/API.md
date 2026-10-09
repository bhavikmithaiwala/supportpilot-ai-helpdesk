# SupportPilot API

Base path `/api`. JSON responses use `{data}` and errors `{error:{message}}`; lists include `{pagination:{page,limit,total}}`. Sent messages are human-authored plain text. IDs are MongoDB ObjectIds except user API serializers use `id`.

## Authentication

`POST /auth/login` with `{email,password}` returns `{data:{user,csrf}}` and an HttpOnly `sp_session` cookie. Sessions expire after 8 hours; only SHA-256 token hashes are stored. Passwords use salted scrypt. `GET /auth/me` restores identity and CSRF token. `POST /auth/logout` revokes the session and disconnects its sockets.

All mutations require `Origin` equal to configured `APP_ORIGIN`. Except login, mutations also require `X-CSRF-Token` from login/me. HttpClient includes cookies automatically; command-line clients must supply these headers and preserve cookies. Production cookies require HTTPS. Do not store session tokens in localStorage.

## Tickets

| Endpoint | Body/query | Access |
|---|---|---|
| GET /tickets | page (1+), limit (1–100), status, priority, category, search (subject), assigned (`me`/`unassigned`), sort (`updated`/`created`/`oldest`) | Customer owns only; staff all |
| POST /tickets | `{subject,description}` | Authenticated; requester is session user |
| GET /tickets/:id | Returns `{ticket,messages}`, marks read | Ownership enforced; public messages only for customers |
| PATCH /tickets/:id | `{version,status?,reason?,assignedAgentId?,category?,priority?}` | Staff |
| POST /tickets/:id/messages | `{version,body}` | Authenticated; own ticket for customer |
| POST /tickets/:id/replies | `{version,body}` | Staff public reply |
| POST /tickets/:id/notes | `{version,body}` | Staff internal note |
| GET /tickets/:id/events | Actor, timestamp, before/after values | Staff only |
| GET /staff | Active staff names/IDs for assignment | Staff only |

`version` is the latest ticket `__v`. A stale version gives 409; refresh before retrying. Subject max 160 characters, description/message max 10,000. Unknown payload fields are rejected. Missing or invisible tickets return 404. Assignment targets must be active staff; `null` unassigns. No deletion endpoint for messages or audit events.

Permitted transitions: `new → open/resolved`; `open → waiting_on_customer/resolved`; `waiting_on_customer → open/resolved`; `resolved → open/closed`; `closed → open` (staff reason required). Assignment or a public reply opens a new ticket. Customer public replies reopen waiting/resolved tickets. Customers cannot reply to closed tickets.

## Assistance

`POST /tickets/:id/suggestions` with `{cloud:false,consent:false}` returns category, priority, explanations, alternatives, editable `text`, provider, and `draftId`. Staff only; capped at 10 requests/minute/IP. Local provider requires no network or key. Cloud requests additionally require server enablement, provider/key/model configuration, and explicit consent. Unavailable/malformed/timed-out providers return a local draft and safe notice.

`POST /tickets/:id/suggestions/:draftId/approve` or `/reject` reviews a pending draft requested by that staff member. Approval **does not send**. A separate public reply request is required. Drafts expire after 7 days. There is no model-controlled write tool.

## Analytics and reports

`GET /analytics/summary?from=<ISO datetime>&to=<ISO datetime>` is staff-only. Returns `statuses`, `categories`, `trends` (UTC day), and `metrics` arrays aggregated from MongoDB. Dates filter ticket creation time. Metrics include total, active backlog, average first-response milliseconds, and average current-resolution milliseconds. No measurable response/resolution returns null, shown as a dash. Internal notes and drafts never establish first response. Reopening clears `resolvedAt`, so reopened tickets leave resolution averages until resolved again.

`GET /reports/tickets.csv` is staff-only and exports at most 10,000 tickets across all dates, newest first. Includes number, subject, status, category, priority and creation time. No notes, messages, emails or drafts. Quotes escaped and formula-leading cells prefixed with an apostrophe.

## Administration

`GET /users?page=1`: admin-only, 20/page. `POST /users` requires `{name,email,password,role}`; password 12–128 characters. `PATCH /users/:id` accepts `{active?,role?}`, revokes sessions and disconnects sockets. Administrators cannot change their own access. Duplicate emails return 409. Public registration is intentionally absent; administrators provision accounts.

`GET /settings` returns `overdueHours` and cloud configuration status. `PATCH /settings` accepts `{overdueHours}` (integer 1–168). Both admin-only. `GET /staff` does not expose emails.

## Limited attachments

`GET /tickets/:id/attachments` returns public attachment metadata. `POST /tickets/:id/attachments` accepts `{name,content}`: safe ASCII filename ending in `.txt`, UTF-8 content up to 16 KiB, no NUL characters. Ticket cap 10 files. `GET /attachments/:id` enforces ticket visibility, serves `text/plain` as an attachment with no-store/nosniff headers. Data stored privately in MongoDB. No images, arbitrary binary files, or inline rendering. Files are public to ticket participants; do not upload private notes or secrets. Antivirus scanning is not implemented.

## Socket.IO

Same HTTP server, `/socket.io`. Handshake requires valid session cookie and trusted Origin. `subscribe(ticketId, acknowledgment)` verifies ticket visibility and returns true/false; `unsubscribe(ticketId)` leaves rooms. `ticket:changed` emits **only `{id}`**, causing scoped REST refresh. Internal changes notify staff only. Unrelated customers receive nothing. Each publish rechecks live session/account; periodic checks disconnect expired sockets within 5 seconds. Logout and admin access changes disconnect immediately. Reconnect triggers a refresh.

## Errors

400 validation, 401 expired/absent session, 403 origin/CSRF/role denial, 404 invisible/missing resource, 409 stale write/invalid lifecycle/duplicate, 413 request exceeds 32 KiB, 429 throttled, 500 generic service failure. `GET /health` returns 503 when disconnected from MongoDB. No prompt, key, password hash or stack trace appears in errors.
