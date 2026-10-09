import { bootstrapApplication } from '@angular/platform-browser';
import 'zone.js';
import { provideZoneChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { App } from './app/app';
import { authGuard, staffGuard, adminGuard, credentials } from './app/core/api';
bootstrapApplication(App, {
  providers: [
    provideZoneChangeDetection(),
    provideHttpClient(withInterceptors([credentials])),
    provideRouter([
      {
        path: 'login',
        loadComponent: () => import('./app/features/login/login').then((m) => m.Login),
      },
      {
        path: 'tickets',
        canActivate: [authGuard],
        loadComponent: () => import('./app/features/tickets/inbox').then((m) => m.Inbox),
      },
      {
        path: 'tickets/:id',
        canActivate: [authGuard],
        loadComponent: () => import('./app/features/tickets/detail').then((m) => m.Detail),
      },
      {
        path: 'new',
        canActivate: [authGuard],
        loadComponent: () => import('./app/features/tickets/new-ticket').then((m) => m.NewTicket),
      },
      {
        path: 'analytics',
        canActivate: [authGuard, staffGuard],
        loadComponent: () => import('./app/features/analytics/analytics').then((m) => m.Analytics),
      },
      {
        path: 'users',
        canActivate: [authGuard, adminGuard],
        loadComponent: () => import('./app/features/admin/users').then((m) => m.Users),
      },
      {
        path: 'settings',
        canActivate: [authGuard, adminGuard],
        loadComponent: () => import('./app/features/admin/settings').then((m) => m.Settings),
      },
      { path: '', pathMatch: 'full', redirectTo: 'tickets' },
      { path: '**', redirectTo: 'tickets' },
    ]),
  ],
}).catch(console.error);
