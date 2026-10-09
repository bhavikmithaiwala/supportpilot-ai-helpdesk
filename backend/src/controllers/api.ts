import { analyticsSummary } from '../services/analytics.js';
import { addAttachment } from '../services/attachments.js';
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { config } from '../config/index.js';
import { ApiError, requireAuth, csrfDefense, staff, admin } from '../middleware/security.js';
import {
  User,
  Session,
  Ticket,
  Message,
  TicketEvent,
  Draft,
  ReadState,
  Settings,
  Attachment,
  statuses,
  categories,
  priorities,
  roles,
} from '../models/index.js';
import { createTicket, visibleTicket, mutateTicket } from '../services/tickets.js';
import { suggestion } from '../services/triage.js';
import type { Server } from 'socket.io';
import { publish } from '../sockets/index.js';
import {
  serializeUser,
  loginAccount,
  provisionAccount,
  changeAccess,
} from '../services/accounts.js';
const text = (max: number) => z.string().trim().min(1).max(max);
const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid ID');
const version = z.number().int().nonnegative();
const patch = z
  .object({
    version,
    status: z.enum(statuses).optional(),
    reason: text(500).optional(),
    assignedAgentId: objectId.nullable().optional(),
    category: z.enum(categories).optional(),
    priority: z.enum(priorities).optional(),
  })
  .strict()
  .refine((x) => Object.keys(x).length > 1, 'No change supplied');
const password = z.string().min(12).max(128);
const account = z
  .object({
    name: text(80),
    email: z
      .string()
      .email()
      .max(254)
      .transform((x) => x.toLowerCase()),
    password,
    role: z.enum(roles),
  })
  .strict();
const cookieOptions = {
  httpOnly: true,
  secure: config.production,
  sameSite: 'lax' as const,
  path: '/',
};
function csvCell(value: unknown) {
  const str = String(value ?? '');
  return `"${(/^[\s]*[=+@-]/.test(str) ? "'" : '') + str.replace(/"/g, '""')}"`;
}
export function apiRouter(getIo: () => Server | undefined) {
  const router = Router();
  router.post(
    '/auth/login',
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 20,
      standardHeaders: 'draft-8',
      legacyHeaders: false,
      message: { error: { message: 'Too many login attempts' } },
    }),
    async (req, res) => {
      const input = z
        .object({ email: z.string().email().max(254), password: z.string().min(1).max(128) })
        .strict()
        .parse(req.body);
      const { user, token, csrf } = await loginAccount(input.email, input.password);
      res
        .cookie('sp_session', token, { ...cookieOptions, maxAge: 8 * 3600000 })
        .json({ data: { user, csrf } });
    },
  );
  router.use(requireAuth, csrfDefense);
  router.get('/auth/me', (req, res) => res.json({ data: { user: req.identity, csrf: req.csrf } }));
  router.post('/auth/logout', async (req, res) => {
    await Session.deleteOne({ _id: req.sessionId });
    getIo()?.in(`session:${req.sessionId}`).disconnectSockets(true);
    res.clearCookie('sp_session', cookieOptions).json({ data: null });
  });
  router.get('/staff', staff, async (_req, res) =>
    res.json({
      data: (
        await User.find({ active: true, role: { $in: ['agent', 'admin'] } }).select('name role')
      ).map((u) => ({ id: String(u._id), name: u.name, role: u.role })),
    }),
  );
  router.get('/tickets', async (req, res) => {
    const q = z
      .object({
        page: z.coerce.number().int().min(1).max(10000).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: z.enum(statuses).optional(),
        priority: z.enum(priorities).optional(),
        category: z.enum(categories).optional(),
        search: z.string().max(100).optional(),
        assigned: z.enum(['me', 'unassigned']).optional(),
        sort: z.enum(['updated', 'created', 'oldest']).default('updated'),
      })
      .strict()
      .parse(req.query);
    const filter: any = req.identity.role === 'customer' ? { customerId: req.identity.id } : {};
    for (const key of ['status', 'priority', 'category'] as const) if (q[key]) filter[key] = q[key];
    if (q.search)
      filter.subject = { $regex: q.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    if (q.assigned) filter.assignedAgentId = q.assigned === 'me' ? req.identity.id : null;
    const sort: any =
      q.sort === 'updated'
        ? { updatedAt: -1, _id: -1 }
        : q.sort === 'oldest'
          ? { createdAt: 1, _id: 1 }
          : { createdAt: -1, _id: -1 };
    const [tickets, total, setting] = await Promise.all([
      Ticket.find(filter)
        .sort(sort)
        .skip((q.page - 1) * q.limit)
        .limit(q.limit)
        .lean(),
      Ticket.countDocuments(filter),
      Settings.findOne({ key: 'workspace' }),
    ]);
    const reads = await ReadState.find({
      userId: req.identity.id,
      ticketId: { $in: tickets.map((t) => t._id) },
    });
    const readMap = new Map(reads.map((r) => [String(r.ticketId), r.readAt]));
    res.json({
      data: tickets.map((t) => ({
        ...t,
        unread: !readMap.get(String(t._id)) || readMap.get(String(t._id))! < t.updatedAt,
        overdue:
          !t.firstRespondedAt &&
          !['resolved', 'closed'].includes(t.status) &&
          Date.now() - t.createdAt.getTime() > (setting?.overdueHours || 24) * 3600000,
      })),
      pagination: { page: q.page, limit: q.limit, total },
    });
  });
  router.post('/tickets', async (req, res) => {
    const input = z
      .object({ subject: text(160), description: text(10000) })
      .strict()
      .parse(req.body);
    const ticket = await createTicket(req.identity, input);
    if (getIo()) await publish(getIo()!, String(ticket._id));
    res.status(201).json({ data: ticket });
  });
  router.get('/tickets/:id', async (req, res) => {
    const ticket = await visibleTicket(String(req.params.id), req.identity);
    const messages = await Message.find({
      ticketId: ticket._id,
      ...(req.identity.role === 'customer' ? { visibility: 'public' } : {}),
    })
      .sort({ createdAt: 1, _id: 1 })
      .populate('authorId', 'name role');
    await ReadState.findOneAndUpdate(
      { userId: req.identity.id, ticketId: ticket._id },
      { readAt: new Date() },
      { upsert: true },
    );
    res.json({ data: { ticket, messages } });
  });
  router.patch('/tickets/:id', staff, async (req, res) => {
    const { version, ...action } = patch.parse(req.body);
    const ticket = await mutateTicket(String(req.params.id), req.identity, version, action);
    if (getIo()) await publish(getIo()!, String(ticket._id));
    res.json({ data: ticket });
  });
  for (const endpoint of ['messages', 'replies', 'notes'])
    router.post(
      `/tickets/:id/${endpoint}`,
      ...(endpoint === 'messages' ? [] : [staff]),
      async (req, res) => {
        const input = z
          .object({ body: text(10000), version })
          .strict()
          .parse(req.body);
        const ticket = await mutateTicket(String(req.params.id), req.identity, input.version, {
          body: input.body,
          visibility: endpoint === 'notes' ? 'internal' : 'public',
        });
        if (getIo()) await publish(getIo()!, String(ticket._id), endpoint === 'notes');
        res.status(201).json({ data: ticket });
      },
    );
  router.get('/tickets/:id/events', staff, async (req, res) => {
    await visibleTicket(String(req.params.id), req.identity);
    res.json({
      data: await TicketEvent.find({ ticketId: req.params.id })
        .sort({ createdAt: 1, _id: 1 })
        .populate('actorId', 'name'),
    });
  });
  router.get('/tickets/:id/attachments', async (req, res) => {
    await visibleTicket(String(req.params.id), req.identity);
    res.json({
      data: await Attachment.find({ ticketId: req.params.id })
        .select('name size createdAt')
        .sort({ createdAt: 1 }),
    });
  });
  router.post('/tickets/:id/attachments', async (req, res) => {
    const input = z
      .object({
        name: z.string().regex(/^[a-zA-Z0-9 _.-]{1,100}\.txt$/),
        content: z.string().max(16384),
      })
      .strict()
      .parse(req.body);
    const attachment = await addAttachment(String(req.params.id), req.identity, input);
    if (getIo()) await publish(getIo()!, String(req.params.id));
    res.status(201).json({ data: attachment });
  });
  router.get('/attachments/:id', async (req, res) => {
    const id = objectId.parse(req.params.id);
    const attachment = await Attachment.findById(id).select('+bytes');
    if (!attachment) throw new ApiError(404, 'Attachment not found');
    await visibleTicket(String(attachment.ticketId), req.identity);
    res
      .set('Cache-Control', 'no-store')
      .type('text/plain')
      .attachment(attachment.name)
      .send(attachment.bytes);
  });
  router.post(
    '/tickets/:id/suggestions',
    staff,
    rateLimit({
      windowMs: 60000,
      limit: 10,
      message: { error: { message: 'Suggestion limit reached' } },
    }),
    async (req, res) => {
      const input = z
        .object({ cloud: z.boolean().default(false), consent: z.boolean().default(false) })
        .strict()
        .parse(req.body);
      const ticket = await visibleTicket(String(req.params.id), req.identity);
      const result = await suggestion(
        `${ticket.subject}\n${ticket.description}`,
        input.cloud,
        input.consent,
      );
      const draft = await Draft.create({
        ticketId: ticket._id,
        requestedBy: req.identity.id,
        text: result.text,
        provider: result.provider,
      });
      res.json({ data: { ...result, draftId: String(draft._id) } });
    },
  );
  router.post('/tickets/:id/suggestions/:draftId/:review', staff, async (req, res) => {
    await visibleTicket(String(req.params.id), req.identity);
    const review = z.enum(['approve', 'reject']).parse(req.params.review);
    const id = objectId.parse(req.params.draftId);
    const draft = await Draft.findOneAndUpdate(
      { _id: id, ticketId: req.params.id, requestedBy: req.identity.id, review: 'pending' },
      { review: review === 'approve' ? 'approved' : 'rejected' },
      { new: true },
    );
    if (!draft) throw new ApiError(404, 'Pending draft not found');
    res.json({ data: { review: draft.review } });
  });
  router.get('/analytics/summary', staff, async (req, res) => {
    const q = z
      .object({ from: z.string().datetime().optional(), to: z.string().datetime().optional() })
      .strict()
      .parse(req.query);
    const result = await analyticsSummary(q);
    res.json({ data: result });
  });
  router.get('/reports/tickets.csv', staff, async (_req, res) => {
    const tickets = await Ticket.find().sort({ createdAt: -1 }).limit(10000).lean();
    res
      .type('text/csv')
      .attachment('supportpilot-tickets.csv')
      .send(
        [
          'Number,Subject,Status,Category,Priority,Created',
          ...tickets.map((t) =>
            [t.ticketNumber, t.subject, t.status, t.category, t.priority, t.createdAt.toISOString()]
              .map(csvCell)
              .join(','),
          ),
        ].join('\r\n'),
      );
  });
  router.get('/users', admin, async (req, res) => {
    const { page } = z
      .object({ page: z.coerce.number().int().min(1).default(1) })
      .strict()
      .parse(req.query);
    const [users, total] = await Promise.all([
      User.find()
        .sort({ _id: 1 })
        .skip((page - 1) * 20)
        .limit(20),
      User.countDocuments(),
    ]);
    res.json({ data: users.map(serializeUser), pagination: { page, limit: 20, total } });
  });
  router.post('/users', admin, async (req, res) => {
    const input = account.parse(req.body);
    res.status(201).json({ data: await provisionAccount(input) });
  });
  router.patch('/users/:id', admin, async (req, res) => {
    const id = objectId.parse(req.params.id);
    const input = z
      .object({ active: z.boolean().optional(), role: z.enum(roles).optional() })
      .strict()
      .refine((x) => Object.keys(x).length > 0)
      .parse(req.body);
    const user = await changeAccess(id, req.identity.id, input);
    getIo()?.in(`user:${id}`).disconnectSockets(true);
    res.json({ data: user });
  });
  router.get('/settings', admin, async (_req, res) =>
    res.json({
      data: {
        overdueHours: (await Settings.findOne({ key: 'workspace' }))?.overdueHours || 24,
        cloudEnabled: process.env.AI_ENABLED === 'true' && process.env.AI_PROVIDER === 'gemini',
      },
    }),
  );
  router.patch('/settings', admin, async (req, res) => {
    const input = z
      .object({ overdueHours: z.number().int().min(1).max(168) })
      .strict()
      .parse(req.body);
    await Settings.updateOne({ key: 'workspace' }, input, { upsert: true });
    res.json({ data: input });
  });
  return router;
}
