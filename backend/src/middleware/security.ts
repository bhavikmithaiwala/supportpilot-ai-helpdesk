import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Request, Response, NextFunction } from 'express';
import { Session, User } from '../models/index.js';
import { config } from '../config/index.js';
const scrypt = promisify(scryptCallback);
export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString('hex')}`;
}
export async function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expected = Buffer.from(hash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export interface Identity {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'agent' | 'admin';
}
declare module 'express-serve-static-core' {
  interface Request {
    identity: Identity;
    sessionId: string;
    csrf: string;
  }
}
export async function authenticate(token?: string) {
  if (!token) return null;
  const session = await Session.findOne({
    tokenHash: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  const user = await User.findOne({ _id: session.userId, active: true });
  if (!user) return null;
  return {
    identity: {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
    } as Identity,
    session,
  };
}
export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const auth = await authenticate(req.cookies?.sp_session);
    if (!auth) throw new ApiError(401, 'Please sign in');
    req.identity = auth.identity;
    req.sessionId = String(auth.session._id);
    req.csrf = auth.session.csrf;
    next();
  } catch (e) {
    next(e);
  }
}
export const staff = (req: Request, _res: Response, next: NextFunction) =>
  req.identity.role === 'customer' ? next(new ApiError(403, 'Staff access required')) : next();
export const admin = (req: Request, _res: Response, next: NextFunction) =>
  req.identity.role !== 'admin' ? next(new ApiError(403, 'Administrator access required')) : next();
export function originDefense(req: Request, _res: Response, next: NextFunction) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('origin') !== config.origin)
    return next(new ApiError(403, 'Untrusted request origin'));
  next();
}
export function csrfDefense(req: Request, _res: Response, next: NextFunction) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && req.get('x-csrf-token') !== req.csrf)
    return next(new ApiError(403, 'Invalid CSRF token'));
  next();
}
