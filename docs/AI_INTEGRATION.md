# AI integration — free-by-default, optional Gemini

## Mandatory design rule
**SupportPilot must run fully with NO API key, NO external AI vendor, and NO model billing.** Local deterministic classification rules and safe reply templates are first-class features, not a broken fallback.

## Local triage provider
- Normalize ticket subject and description; inspect only user-provided message content.
- Simple category rules: billing cues (`invoice`, `charge`, `refund`), technical (`error`, `broken`, `login failure`), account (`password`, `profile`, `verification`), general otherwise; more than one category may be suggested and human overrides always win.
- Priority suggestions: urgent cues plus explicit service-impact clues; score is an **internal rule score**, not an empirical probability of fraud/urgency.
- Return a structure like `{category, priority, explanations: string[], provider: 'local'}`.
- Provide editable draft text templates for common cases, avoiding promises like guaranteed refunds or completed actions.
- Unit-test false positives and ambiguous tickets; include notes documenting the limits of keyword-based categorization.

## Optional Gemini adapter
- Set `AI_PROVIDER=gemini` and `GEMINI_API_KEY=...` **in backend `.env` only**. `AI_PROVIDER=local` is default. `AI_ENABLED=false` by default until explicitly enabled. Never expose keys in Angular bundles, logs, errors, or Git.
- Use a currently supported official SDK and configurable model name. Avoid hardcoded claims about free-tier rates, prices, or model availability. Free-tier access can depend on provider/account/region and has quotas; the user must opt in and check pricing before enabling.
- Require an explicit agent action and visible permission/consent before sending support text externally. Consider using fictional examples only in a portfolio demo. Minimize/redact emails, phone numbers, passwords, tokens, payment card-like strings and other unnecessary personal information.
- Prompt only for one proposed reply or classification JSON. Strictly validate response structure and length server side. Reject invalid output, escape/render as plain text, and fall back to local provider on provider timeouts/errors/rate limits.
- Server-side timeout, bounded retries (not indefinite), basic rate limits, and error logging without prompt/PII. No direct model access to database writes, messaging APIs, or administrative actions.
- AI suggestions stored/delivered as drafts; only a real agent pressing Send creates a public reply. Use test to prove no auto-send.

## Suggested user flow
Agent opens ticket -> clicks `Suggest category/priority` (local rules) or `Draft reply` (local template or consented Gemini) -> reviews editable text and explanation -> can reject or modify -> clicking **Send reply** calls normal reply endpoint -> only then public message appears.

## Quick setup
No-key mode:
```
AI_PROVIDER=local
AI_ENABLED=false
```
Optional cloud mode (only after user configures their own account/key and accepts its terms):
```
AI_PROVIDER=gemini
AI_ENABLED=true
GEMINI_API_KEY=replace-with-user-owned-key
GEMINI_MODEL=your-supported-model
```
Provide `.env.example` without a real key. A free account/API key does not imply unlimited free use. UI should say when the AI provider is disabled/unavailable and offer a fully working local option.

## Required tests
1. No key, no network: local category and draft suggestions work.
2. Wrong/malformed model JSON: fallback to local classification and explain failure without exposing secrets.
3. Timeout or rate limit: no ticket state change; UI can retry manually.
4. Model says "send this now": result stays only a draft.
5. Cross-customer AI suggestion access blocked.
6. Plaintext rendering prevents script injection in model-generated text.
7. Consent not granted: no outbound cloud request.
