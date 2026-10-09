import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { randomBytes } from 'node:crypto';
const db = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: '8.0.12' },
});
process.env.MONGODB_URI = db.getUri('supportpilot_e2e');
// Never use this isolated runner against an externally configured database.
process.env.SEED_PASSWORD = process.env.E2E_PASSWORD || randomBytes(24).toString('base64url');
await import('../seed.js');
await import('../server.js');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void db.stop();
  });
