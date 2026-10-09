import mongoose from 'mongoose';
import { randomBytes } from 'node:crypto';
import { User, Session } from '../models/index.js';
import { ApiError, checkPassword, hashPassword, hashToken } from '../middleware/security.js';

export function serializeUser(user: {
  _id: unknown;
  name: string;
  email: string;
  role: string;
  active: boolean;
}) {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
  };
}
export async function loginAccount(email: string, password: string) {
  const user = await User.findOne({ email: email.toLowerCase(), active: true }).select(
    '+passwordHash',
  );
  // Perform a password derivation even for an unknown account to reduce account enumeration timing.
  const dummy = '00000000000000000000000000000000:' + '00'.repeat(64);
  const valid = await checkPassword(password, user?.passwordHash || dummy);
  if (!user || !valid) throw new ApiError(401, 'Invalid email or password');
  const token = randomBytes(32).toString('hex');
  const csrf = randomBytes(32).toString('hex');
  await Session.create({
    tokenHash: hashToken(token),
    userId: user._id,
    csrf,
    expiresAt: new Date(Date.now() + 8 * 3600000),
  });
  return { user: serializeUser(user), token, csrf };
}
export async function provisionAccount(input: {
  name: string;
  email: string;
  role: 'customer' | 'agent' | 'admin';
  password: string;
}) {
  return serializeUser(
    await User.create({
      name: input.name,
      email: input.email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
    }),
  );
}
export async function changeAccess(
  id: string,
  actorId: string,
  input: { active?: boolean; role?: 'customer' | 'agent' | 'admin' },
) {
  if (id === actorId) throw new ApiError(409, 'Cannot change your own access');
  let result: ReturnType<typeof serializeUser> | undefined;
  await mongoose.connection.transaction(async (session) => {
    const user = await User.findByIdAndUpdate(id, input, { new: true, session });
    if (!user) throw new ApiError(404, 'User not found');
    await Session.deleteMany({ userId: id }, { session });
    result = serializeUser(user);
  });
  return result!;
}
