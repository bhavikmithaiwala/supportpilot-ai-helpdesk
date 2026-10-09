import { beforeAll, afterAll, describe, it, expect } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { createServer, Server as HttpServer } from 'node:http';
import { io as connectSocket } from 'socket.io-client';
import { createApp } from '../app.js';
import { attachSockets } from '../sockets/index.js';
import { User, Session, Ticket, Message, TicketEvent } from '../models/index.js';
import { hashPassword } from '../middleware/security.js';
import { config } from '../config/index.js';
let db: MongoMemoryReplSet;
let server: HttpServer;
let sockets: ReturnType<typeof attachSockets>;
let base: string;
const app = createApp(() => sockets);
const actors: Record<string, { cookie: string; csrf: string; id: string }> = {};
const testPassword = 'fictional-integration-password';
function api(actor: string, method: 'get' | 'post' | 'patch', path: string, body?: unknown) {
  const req = request(app)[method](`/api${path}`).set('Origin', config.origin);
  if (actors[actor])
    req.set('Cookie', actors[actor]!.cookie).set('X-CSRF-Token', actors[actor]!.csrf);
  return body === undefined ? req : req.send(body);
}
async function socket(actor: string) {
  const s = connectSocket(base, {
    transports: ['websocket'],
    extraHeaders: { Origin: config.origin, Cookie: actors[actor]!.cookie },
    reconnection: false,
  });
  await new Promise<void>((resolve, reject) => {
    s.once('connect', () => resolve());
    s.once('connect_error', reject);
  });
  return s;
}
beforeAll(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1 }, binary: { version: '8.0.12' } });
  await mongoose.connect(db.getUri());
  await Promise.all([User.init(), Session.init(), Ticket.init()]);
  for (const [name, role] of [
    ['c1', 'customer'],
    ['c2', 'customer'],
    ['agent', 'agent'],
    ['admin', 'admin'],
  ] as const) {
    const user = await User.create({
      name,
      email: `${name}@example.test`,
      role,
      passwordHash: await hashPassword(testPassword),
    });
    const login = await api('', 'post', '/auth/login', {
      email: user.email,
      password: testPassword,
    });
    expect(login.status).toBe(200);
    actors[name] = {
      id: String(user._id),
      csrf: login.body.data.csrf,
      cookie: login.headers['set-cookie'][0].split(';')[0],
    };
  }
  server = createServer(app);
  sockets = attachSockets(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${(server.address() as any).port}`;
});
afterAll(async () => {
  sockets?.close();
  server?.close();
  await mongoose.disconnect();
  await db?.stop();
});
describe('real persistence and access boundaries', () => {
  let id: string;
  let currentVersion = 0;
  it('rejects missing auth, bad origin, CSRF and privilege injection', async () => {
    expect((await api('', 'get', '/tickets')).status).toBe(401);
    expect(
      (
        await request(app)
          .post('/api/auth/login')
          .send({ email: 'c1@example.test', password: testPassword })
      ).status,
    ).toBe(403);
    expect(
      (
        await request(app)
          .post('/api/tickets')
          .set('Origin', config.origin)
          .set('Cookie', actors.c1!.cookie)
          .send({ subject: 'x', description: 'y' })
      ).status,
    ).toBe(403);
    expect(
      (
        await api('c1', 'post', '/tickets', {
          subject: 'x',
          description: 'y',
          customerId: actors.c2!.id,
        })
      ).status,
    ).toBe(400);
    expect((await api('c1', 'get', '/users')).status).toBe(403);
    expect((await api('agent', 'get', '/users')).status).toBe(403);
  });
  it('creates initial message and event atomically and scopes lists', async () => {
    const response = await api('c1', 'post', '/tickets', {
      subject: 'Invoice refund request',
      description: 'Fictional invoice question',
    });
    expect(response.status).toBe(201);
    id = response.body.data._id;
    expect(await Message.countDocuments({ ticketId: id })).toBe(1);
    expect(await TicketEvent.countDocuments({ ticketId: id })).toBe(1);
    expect((await api('c2', 'get', `/tickets/${id}`)).status).toBe(404);
    expect((await api('c2', 'get', '/tickets')).body.data).toHaveLength(0);
    expect((await api('c1', 'get', '/tickets?limit=1000')).status).toBe(400);
    expect((await api('c1', 'get', '/tickets/not-an-id')).status).toBe(400);
  });
  it('keeps draft separate from messages, state, and first response', async () => {
    const result = await api('agent', 'post', `/tickets/${id}/suggestions`, {});
    expect(result.body.data.provider).toBe('local');
    expect(await Message.countDocuments({ ticketId: id })).toBe(1);
    expect((await Ticket.findById(id))!.firstRespondedAt).toBeNull();
    expect((await api('c1', 'post', `/tickets/${id}/suggestions`, {})).status).toBe(403);
    expect(
      (
        await api(
          'agent',
          'post',
          `/tickets/${id}/suggestions/${result.body.data.draftId}/approve`,
          {},
        )
      ).status,
    ).toBe(200);
    expect(await Message.countDocuments({ ticketId: id })).toBe(1);
  });
  it('authenticates sockets and rejects unrelated subscriptions', async () => {
    const unrelated = await socket('c2');
    try {
      const allowed = await new Promise<boolean>((resolve) =>
        unrelated.emit('subscribe', id, resolve),
      );
      expect(allowed).toBe(false);
    } finally {
      unrelated.disconnect();
    }
    const invalid = connectSocket(base, {
      transports: ['websocket'],
      extraHeaders: { Origin: config.origin },
      reconnection: false,
    });
    try {
      const message = await new Promise<string>((resolve) =>
        invalid.once('connect_error', (e) => resolve(e.message)),
      );
      expect(message).toBe('Unauthorized');
    } finally {
      invalid.disconnect();
    }
  });
  it('hides internal notes in REST and socket delivery', async () => {
    const customer = await socket('c1');
    const unrelated = await socket('c2');
    const agent = await socket('agent');
    const received: Record<string, unknown[]> = { customer: [], unrelated: [], agent: [] };
    customer.on('ticket:changed', (p) => received.customer!.push(p));
    unrelated.on('ticket:changed', (p) => received.unrelated!.push(p));
    agent.on('ticket:changed', (p) => received.agent!.push(p));
    try {
      expect(
        (await api('c1', 'post', `/tickets/${id}/notes`, { body: 'forbidden', version: 0 })).status,
      ).toBe(403);
      const result = await api('agent', 'post', `/tickets/${id}/notes`, {
        body: 'PRIVATE-TROUBLESHOOTING',
        version: 0,
      });
      expect(result.status).toBe(201);
      currentVersion = result.body.data.__v;
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(received.customer).toHaveLength(0);
      expect(received.unrelated).toHaveLength(0);
      expect(received.agent).toEqual([{ id }]);
      const detail = await api('c1', 'get', `/tickets/${id}`);
      expect(JSON.stringify(detail.body)).not.toContain('PRIVATE');
      expect((await api('agent', 'get', `/tickets/${id}`)).body.data.messages).toHaveLength(2);
      expect((await api('c1', 'get', `/tickets/${id}/events`)).status).toBe(403);
      expect((await Ticket.findById(id))!.firstRespondedAt).toBeNull();
      await api('agent', 'post', `/tickets/${id}/replies`, {
        body: 'Public reply',
        version: currentVersion,
      });
      currentVersion++;
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(received.customer).toEqual([{ id }]);
      expect(received.unrelated).toHaveLength(0);
    } finally {
      customer.disconnect();
      unrelated.disconnect();
      agent.disconnect();
    }
  });
  it('checks assignment targets, status conflicts, audit, and reopen semantics', async () => {
    expect(
      (
        await api('agent', 'patch', `/tickets/${id}`, {
          version: currentVersion,
          assignedAgentId: actors.c1!.id,
        })
      ).status,
    ).toBe(400);
    expect(
      (await api('agent', 'patch', `/tickets/${id}`, { version: 0, status: 'resolved' })).status,
    ).toBe(409);
    const response = await api('agent', 'patch', `/tickets/${id}`, {
      version: currentVersion,
      status: 'waiting_on_customer',
      assignedAgentId: actors.agent!.id,
    });
    expect(response.status).toBe(200);
    currentVersion = response.body.data.__v;
    const first = (await Ticket.findById(id))!.firstRespondedAt;
    expect(first).not.toBeNull();
    const reply = await api('c1', 'post', `/tickets/${id}/messages`, {
      body: 'More information',
      version: currentVersion,
    });
    expect(reply.body.data.status).toBe('open');
    currentVersion = reply.body.data.__v;
    const resolved = await api('agent', 'patch', `/tickets/${id}`, {
      version: currentVersion,
      status: 'resolved',
    });
    expect(resolved.body.data.resolvedAt).not.toBeNull();
    currentVersion = resolved.body.data.__v;
    const closed = await api('agent', 'patch', `/tickets/${id}`, {
      version: currentVersion,
      status: 'closed',
    });
    currentVersion = closed.body.data.__v;
    expect(
      (await api('c1', 'post', `/tickets/${id}/messages`, { body: 'No', version: currentVersion }))
        .status,
    ).toBe(409);
    expect(
      (await api('agent', 'patch', `/tickets/${id}`, { version: currentVersion, status: 'open' }))
        .status,
    ).toBe(400);
    const opened = await api('agent', 'patch', `/tickets/${id}`, {
      version: currentVersion,
      status: 'open',
      reason: 'Customer requested further investigation',
    });
    expect(opened.body.data.resolvedAt).toBeNull();
    expect(new Date(opened.body.data.firstRespondedAt)).toEqual(first);
    expect(await TicketEvent.countDocuments({ ticketId: id })).toBeGreaterThan(5);
  });
  it('aggregates real data and guards reports', async () => {
    const metrics = await api('agent', 'get', '/analytics/summary');
    expect(metrics.body.data.metrics[0]).toMatchObject({ total: 1, backlog: 1 });
    expect(metrics.body.data.metrics[0].firstResponseMs).toBeGreaterThanOrEqual(0);
    expect((await api('c1', 'get', '/analytics/summary')).status).toBe(403);
    expect((await api('c1', 'get', '/reports/tickets.csv')).status).toBe(403);
    const report = await api('agent', 'get', '/reports/tickets.csv');
    expect(report.text).not.toContain('PRIVATE');
    expect(report.text).toContain('Invoice refund request');
  });
  it('authorizes private text attachment storage and rejects unsafe inputs', async () => {
    const invalid = await api('c1', 'post', `/tickets/${id}/attachments`, {
      name: '../secret.html',
      content: 'bad',
    });
    expect(invalid.status).toBe(400);
    expect(
      (
        await api('c1', 'post', `/tickets/${id}/attachments`, {
          name: 'large.txt',
          content: 'é'.repeat(9000),
        })
      ).status,
    ).toBe(400);
    const uploaded = await api('c1', 'post', `/tickets/${id}/attachments`, {
      name: 'evidence.txt',
      content: 'Fictional evidence',
    });
    expect(uploaded.status).toBe(201);
    const attachmentId = uploaded.body.data._id;
    expect((await api('c2', 'get', `/attachments/${attachmentId}`)).status).toBe(404);
    expect((await api('', 'get', `/attachments/${attachmentId}`)).status).toBe(401);
    const downloaded = await api('agent', 'get', `/attachments/${attachmentId}`);
    expect(downloaded.text).toBe('Fictional evidence');
    expect(downloaded.headers['content-disposition']).toContain('attachment');
    expect(downloaded.headers['x-content-type-options']).toBe('nosniff');
    expect((await api('c1', 'get', `/tickets/${id}/attachments`)).body.data).toHaveLength(1);
  });
  it('provisions accounts without returning password hashes and escapes CSV formulas', async () => {
    const created = await api('admin', 'post', '/users', {
      name: 'New staff',
      email: 'new-staff@example.test',
      role: 'agent',
      password: 'fictional-long-password',
    });
    expect(created.status).toBe(201);
    expect(JSON.stringify(created.body)).not.toContain('passwordHash');
    expect(
      (
        await api('admin', 'post', '/users', {
          name: 'Duplicate',
          email: 'new-staff@example.test',
          role: 'agent',
          password: 'fictional-long-password',
        })
      ).status,
    ).toBe(409);
    await api('c1', 'post', '/tickets', {
      subject: '=SUM(1,2) "quoted"',
      description: 'fictional',
    });
    const report = await api('agent', 'get', '/reports/tickets.csv');
    expect(report.text).toContain(`"'=SUM(1,2) ""quoted"""`);
  });
  it('revokes sessions and live sockets when administrator deactivates staff', async () => {
    const agent = await socket('agent');
    try {
      const disconnected = new Promise<void>((resolve) =>
        agent.once('disconnect', () => resolve()),
      );
      const result = await api('admin', 'patch', `/users/${actors.agent!.id}`, { active: false });
      expect(result.status).toBe(200);
      await disconnected;
      expect((await api('agent', 'get', '/tickets')).status).toBe(401);
    } finally {
      agent.disconnect();
    }
    expect(
      (await api('admin', 'patch', `/users/${actors.admin!.id}`, { active: false })).status,
    ).toBe(409);
  });
  it('expires and logs out sessions', async () => {
    await Session.updateMany({ userId: actors.c2!.id }, { expiresAt: new Date(0) });
    expect((await api('c2', 'get', '/auth/me')).status).toBe(401);
    const s = await socket('c1');
    try {
      const disconnected = new Promise<void>((resolve) => s.once('disconnect', () => resolve()));
      expect((await api('c1', 'post', '/auth/logout', {})).status).toBe(200);
      await disconnected;
      expect((await api('c1', 'get', '/auth/me')).status).toBe(401);
    } finally {
      s.disconnect();
    }
  });
});
