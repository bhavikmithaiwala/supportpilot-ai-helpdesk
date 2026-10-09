import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { CanActivateFn, Router } from '@angular/router';
import { io, Socket } from 'socket.io-client';
export interface User {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'agent' | 'admin';
  active?: boolean;
}
export interface Ticket {
  _id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: string;
  category: string;
  priority: string;
  assignedAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  firstRespondedAt: string | null;
  resolvedAt: string | null;
  __v: number;
  unread?: boolean;
  overdue?: boolean;
}
export interface Message {
  _id: string;
  body: string;
  visibility: string;
  createdAt: string;
  authorId: { name: string; role: string };
}
export interface Envelope<T> {
  data: T;
  pagination?: { page: number; limit: number; total: number };
}
@Injectable({ providedIn: 'root' })
export class Api {
  private http = inject(HttpClient);
  user = signal<User | null>(null);
  csrf = '';
  socket?: Socket;
  changed = signal(0);
  async get<T>(path: string) {
    return firstValueFrom(this.http.get<Envelope<T>>(`/api${path}`));
  }
  async post<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.post<Envelope<T>>(`/api${path}`, body));
  }
  async patch<T>(path: string, body: unknown) {
    return firstValueFrom(this.http.patch<Envelope<T>>(`/api${path}`, body));
  }
  async restore() {
    try {
      const { data } = await this.get<{ user: User; csrf: string }>('/auth/me');
      this.setSession(data);
    } catch {
      this.clear();
    }
  }
  async login(email: string, password: string) {
    const { data } = await this.post<{ user: User; csrf: string }>('/auth/login', {
      email,
      password,
    });
    this.setSession(data);
  }
  setSession(data: { user: User; csrf: string }) {
    this.user.set(data.user);
    this.csrf = data.csrf;
    this.socket?.disconnect();
    this.socket = io({ withCredentials: true, transports: ['websocket'] });
    this.socket.on('ticket:changed', () => this.changed.update((n) => n + 1));
    this.socket.on('connect', () => this.changed.update((n) => n + 1));
  }
  async logout() {
    await this.post('/auth/logout', {});
    this.clear();
  }
  clear() {
    this.user.set(null);
    this.csrf = '';
    this.socket?.disconnect();
  }
}
export const credentials: HttpInterceptorFn = (req, next) => {
  const api = inject(Api);
  return next(
    req.clone({ withCredentials: true, setHeaders: api.csrf ? { 'X-CSRF-Token': api.csrf } : {} }),
  );
};
export const authGuard: CanActivateFn = async () => {
  const api = inject(Api);
  const router = inject(Router);
  if (!api.user()) await api.restore();
  return api.user() ? true : router.createUrlTree(['/login']);
};
export const staffGuard: CanActivateFn = () =>
  inject(Api).user()?.role !== 'customer' || inject(Router).createUrlTree(['/tickets']);
export const adminGuard: CanActivateFn = () =>
  inject(Api).user()?.role === 'admin' || inject(Router).createUrlTree(['/tickets']);
export function errorText(error: unknown) {
  return error instanceof HttpErrorResponse
    ? error.error?.error?.message || 'Connection failed. Please retry.'
    : 'Something went wrong. Please retry.';
}
