# Local demo walkthrough

1. Start `npm run dev:isolated`, note its generated local password, and run `npm run dev:frontend` in a second terminal. Use separate browser profiles for customer and agent. Data is fictional and disposable.
2. Sign in as `customer1@example.test`. Create an invoice ticket and open its conversation. A different customer must receive 404 for this ticket through the API.
3. Sign in as `agent1@example.test`, open the same ticket, assign it, and add an internal note. The customer sees no private note or staff activity.
4. Request a local reply. Inspect the category/priority explanation, optionally apply triage, and click Edit reply. The text enters the composer but no message has been sent. Revise it and explicitly Send reply. The customer's conversation refreshes live.
5. Mark waiting on customer; customer replies, reopening to open. Resolve as agent. First response counts the public staff reply, not the note or draft. Analytics reflects real data.
6. Upload small fictional text evidence and download it from an authorized participant. Unrelated customers cannot access it. Files are public within the ticket, so never upload staff notes.
7. As `admin@example.test`, provision a new agent, deactivate it, and show that its session/socket access stops. Set the overdue reminder threshold.
8. Inspect `npm run test` and `npm run e2e` output. Desktop/mobile screenshots in `docs/screenshots` come from actual successful browser journeys. No video was fabricated.

No API key is needed. Gemini remains disabled unless explicitly configured and separately consented. For persistence across restarts, use the Docker setup in README instead of the disposable runner.
