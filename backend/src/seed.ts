import mongoose from 'mongoose';
import { config } from './config/index.js';
import { User, Ticket } from './models/index.js';
import { hashPassword } from './middleware/security.js';
import { createTicket, mutateTicket } from './services/tickets.js';
import type { Identity } from './middleware/security.js';
const password = process.env.SEED_PASSWORD;
if (config.production)
  throw new Error('Fictional demo seeding is disabled in production; use bootstrap-admin');
if (!password || password.length < 12)
  throw new Error('Set SEED_PASSWORD to a local-only password with at least 12 characters');
await mongoose.connect(config.mongo);
if (await User.exists({}))
  throw new Error('Seed requires an empty local database; it never overwrites accounts');
const users = [];
for (const [name, role] of [
  ['admin', 'admin'],
  ['agent1', 'agent'],
  ['agent2', 'agent'],
  ['customer1', 'customer'],
  ['customer2', 'customer'],
  ['customer3', 'customer'],
] as const) {
  const user = await User.create({
    name,
    email: `${name}@example.test`,
    role,
    passwordHash: await hashPassword(password),
  });
  users.push({ id: String(user._id), name, email: user.email, role } as Identity);
}
for (let i = 0; i < 12; i++) {
  const customer = users[3 + (i % 3)]!;
  const t = await createTicket(customer, {
    subject: ['Invoice question', 'Login failure', 'Profile verification', 'General question'][
      i % 4
    ]!,
    description: 'Fictional demo issue. Please help me understand the next steps.',
  });
  if (i % 3 !== 0) {
    await mutateTicket(String(t._id), users[1]!, 0, { assignedAgentId: users[1]!.id });
    await mutateTicket(String(t._id), users[1]!, 1, {
      body: 'Thank you for the details. Could you share a little more context?',
      visibility: 'public',
    });
    await mutateTicket(String(t._id), users[1]!, 2, {
      body: 'Fictional internal troubleshooting note.',
      visibility: 'internal',
    });
    if (i % 2 === 0) {
      const current = await Ticket.findById(t._id);
      await mutateTicket(String(t._id), users[1]!, current!.__v, { status: 'resolved' });
    }
  }
}
console.log(
  'Seeded 6 fictional users and 12 tickets. Accounts: admin, agent1, agent2, customer1, customer2, customer3 @example.test. Password is your SEED_PASSWORD.',
);
await mongoose.disconnect();
