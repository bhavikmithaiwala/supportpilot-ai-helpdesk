# Implementation progress

Reference package read in full. Starting from `d182841` on main; existing reference files and editor settings preserved.

Environment: Node 22.13.1, npm 10.9.2. Docker and mongod unavailable. Test MongoDB will use an isolated downloadable binary if supported. No AI credentials required.

Milestone 1: workspace scripts and reference baseline. Checks: repository status, remote, history and environment inspected. Next: Angular/Express scaffolds and dependency install.

Roadmap is a logical sequence; dependent steps may be combined into meaningful tested commits. No fabricated dates or filler commits.

Milestone 2 (`fe7f2b2`): backend compiles. Implemented models, salted scrypt passwords, hashed cookie sessions, origin + CSRF defense, role checks, transactional ticket/message/audit writes, optimistic conflicts, local drafts and consented optional Gemini, scoped socket invalidation, analytics, CSV, users/settings, and safe seed. Integration verification underway.

Milestone 3: responsive Angular workflows implemented. Angular production build passed (357.51 kB initial before later changes). Sandbox-only build attempt failed with Windows parent-directory access denied; elevated build succeeds. Component/API/socket tests being added. Dependency audit found test-tool advisories; remediation underway. Next: test execution, attachments, end-to-end and release docs.

Milestone 4: Angular upgraded to 21 and Vitest 4.1.11; audit reports zero vulnerabilities. npm's optional-peer resolution crashed (`edgesOut`); project `.npmrc` uses legacy peer resolution with the verified locked dependency tree. Backend 20 tests and Angular 6 tests passed. Lint and both builds passed. Browser verification caught stale asynchronous UI rendering; explicit change notifications added and journeys rerunning. Text attachment authorization and CSV formula tests added. Next: complete browser verification, architecture/service review, release runbook and safe push.

Milestone 5 (`a0ea86e` frontend, `579ef04` verified backend): all 4 desktop/mobile Playwright journeys passed, including real-time refresh, private note exclusion, draft review without auto-send, ticket resolution and admin provisioning/deactivation. Initial browser failures were fixed (async view notifications and WebSocket transport; accessible combobox locator corrected). Actual screenshots captured and inspected. Both builds, lint, 20 backend tests, 6 frontend tests, and formatting checks passed. Attachment upload count is transactionally serialized and concurrency-tested. Added initial-admin bootstrap, readable timeline and service separation. Next: commit final hardening, CI/browser tests and release documentation; push only after final check.

## Roadmap coverage

- 1–8: workspaces, Angular routing/shell, Express health, MongoDB compose/config, lint/format/build, responsive states.
- 9–17: users, password derivation, cookie sessions, login/logout/me, role middleware, bootstrap, Reactive Forms, guards and access tests.
- 18–33: indexed tickets/messages/events, transaction-backed creation, scoped lists/details, lifecycle, assignment/metadata, customer/staff UI, private notes, controls, readable audit timeline and response timestamps.
- 34–40: authenticated WebSockets, scoped invalidations and reconnect refresh, persisted reads, overdue reminders, local rules and editable human overrides.
- 41–47: local/cloud provider boundary, templates, optional official Gemini SDK, consent/redaction, JSON validation, separate draft review/send, failure/timeout/consent tests.
- 48–53: stored-data analytics, metric semantics, date filtering/charts, safe CSV, limited private text storage and upload/download interface.
- 54–60: real MongoDB role/lifecycle/socket tests, rule edge cases, Angular tests, Playwright desktop/mobile flows, CI, API/architecture/README/runbook and actual screenshots.

Dependent steps were grouped into substantive commits; the original 60-step roadmap is preserved. No filler commits, fabricated dates or history rewrites.

Limitations: no live Gemini verification without user credentials; Docker unavailable here (isolated real MongoDB verification succeeded); CI configured but remote result not yet observed; attachments limited to text, threads load in full, CSV capped at 10,000, single workspace/process with in-memory rate limits. No release-blocking local failures remain after the recorded fixes.
