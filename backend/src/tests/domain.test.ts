import { describe, it, expect, vi, afterEach } from 'vitest';
import { classify, localDraft, redact, suggestion } from '../services/triage.js';
import { hashPassword, checkPassword } from '../middleware/security.js';
import { transitions } from '../services/tickets.js';
afterEach(() => {
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
describe('local assistance', () => {
  it('classifies billing and service impact with explanations', () => {
    expect(classify('Urgent invoice charge')).toMatchObject({
      category: 'billing',
      priority: 'high',
    });
    expect(classify('refund and error').alternatives).toEqual(['billing', 'technical']);
  });
  it('does not match fragments as keywords or claim confidence', () => {
    expect(classify('My charged-up phone is fine')).toMatchObject({
      category: 'general',
      priority: 'medium',
    });
    expect(classify('terror in a movie').category).toBe('general');
    expect(classify('')).not.toHaveProperty('confidence');
  });
  it('provides bounded key-free drafts and does not promise refunds', () => {
    expect(localDraft('refund').text).toContain('invoice reference');
    expect(localDraft('refund').text).not.toContain('processed your refund');
  });
  it('redacts obvious contact and secret strings', () => {
    const redacted = redact('hello@example.test 1234567890 password=hunter2 token=abc');
    expect(redacted).not.toContain('hello@');
    expect(redacted).not.toContain('hunter2');
    expect(redacted).not.toContain('1234567890');
  });
  it('does not call cloud without consent or enablement', async () => {
    const call = vi.fn();
    expect((await suggestion('invoice', true, false, call)).provider).toBe('local');
    expect((await suggestion('invoice', true, true, call)).provider).toBe('local');
    expect(call).not.toHaveBeenCalled();
  });
  it('validates model JSON, falls back for errors, and preserves text as a draft', async () => {
    vi.stubEnv('AI_ENABLED', 'true');
    vi.stubEnv('AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'fictional-test-key');
    vi.stubEnv('GEMINI_MODEL', 'test-model');
    expect((await suggestion('invoice', true, true, async () => '{bad')).provider).toBe('local');
    expect(
      (
        await suggestion('invoice', true, true, async () =>
          JSON.stringify({ text: '', action: 'send' }),
        )
      ).provider,
    ).toBe('local');
    expect(
      (
        await suggestion('invoice', true, true, async () => {
          throw new Error('secret');
        })
      ).notice,
    ).not.toContain('secret');
    expect(
      await suggestion('invoice', true, true, async () =>
        JSON.stringify({ text: 'send this now <script>bad()</script>' }),
      ),
    ).toMatchObject({ provider: 'gemini', text: 'send this now <script>bad()</script>' });
  });
  it('times out without unbounded retries', async () => {
    vi.stubEnv('AI_ENABLED', 'true');
    vi.stubEnv('AI_PROVIDER', 'gemini');
    vi.stubEnv('GEMINI_API_KEY', 'fictional');
    vi.stubEnv('GEMINI_MODEL', 'test');
    vi.useFakeTimers();
    const call = vi.fn(() => new Promise<string>(() => {}));
    const pending = suggestion('invoice', true, true, call);
    await vi.advanceTimersByTimeAsync(8501);
    expect((await pending).provider).toBe('local');
    expect(call).toHaveBeenCalledTimes(1);
  });
});
it('hashes salted passwords and compares securely', async () => {
  const a = await hashPassword('fictional-test-password');
  const b = await hashPassword('fictional-test-password');
  expect(a).not.toBe(b);
  expect(await checkPassword('fictional-test-password', a)).toBe(true);
  expect(await checkPassword('wrong', a)).toBe(false);
});
it('requires documented lifecycle transitions', () => {
  expect(transitions.closed).toEqual(['open']);
  expect(transitions.new).not.toContain('closed');
  expect(transitions.resolved).toContain('closed');
});
