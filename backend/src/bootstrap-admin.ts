import mongoose from 'mongoose';
import { z } from 'zod';
import { config } from './config/index.js';
import { User } from './models/index.js';
import { provisionAccount } from './services/accounts.js';

const input = z
  .object({
    name: z.string().trim().min(1).max(80),
    email: z.string().email().max(254),
    password: z.string().min(12).max(128),
  })
  .parse({
    name: process.env.ADMIN_NAME || 'Administrator',
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
  });
await mongoose.connect(config.mongo);
try {
  if (await User.exists({ role: 'admin' }))
    throw new Error('An administrator already exists; bootstrap does not overwrite accounts');
  await provisionAccount({ ...input, role: 'admin' });
  console.log(
    'Initial administrator created. Remove bootstrap credentials from your local environment.',
  );
} finally {
  await mongoose.disconnect();
}
