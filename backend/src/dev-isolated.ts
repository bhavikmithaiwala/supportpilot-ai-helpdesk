/** Local convenience runner: real MongoDB, disposable data, fictional accounts. */
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { randomBytes } from 'node:crypto';
const db = await MongoMemoryReplSet.create({
  replSet: { count: 1 },
  binary: { version: '8.0.12' },
});
process.env.MONGODB_URI = db.getUri('supportpilot_demo');
process.env.SEED_PASSWORD = process.env.SEED_PASSWORD || randomBytes(18).toString('base64url');
console.log(`Disposable local database. Demo password: ${process.env.SEED_PASSWORD}`);
await import('./seed.js');
await import('./server.js');
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    void db.stop();
  });
