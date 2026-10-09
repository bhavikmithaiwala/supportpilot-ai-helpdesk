import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Api, errorText } from './core/api';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'sp-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: ` @if (api.user(); as user) {
      <div class="app-layout">
        <aside class="sidebar">
          <a class="brand" routerLink="/tickets"><span class="brand-icon">S</span> SupportPilot</a
          ><span class="workspace-label">SUPPORT WORKSPACE</span>
          <nav aria-label="Main navigation">
            <a routerLink="/tickets" routerLinkActive="selected"
              >▤ {{ user.role === 'customer' ? 'My tickets' : 'Inbox' }}</a
            ><a routerLink="/new" routerLinkActive="selected">＋ New ticket</a>
            @if (user.role !== 'customer') {
              <a routerLink="/analytics" routerLinkActive="selected">▥ Analytics</a>
            }
            @if (user.role === 'admin') {
              <a routerLink="/users" routerLinkActive="selected">♙ Users</a
              ><a routerLink="/settings" routerLinkActive="selected">⚙ Settings</a>
            }
          </nav>
          <div class="sidebar-bottom">
            <span class="avatar">{{ user.name.slice(0, 1).toUpperCase() }}</span>
            <div>
              <strong>{{ user.name }}</strong
              ><small>{{ user.role }}</small>
            </div>
            <button class="icon-button" (click)="logout()" aria-label="Sign out">↪</button>
          </div>
        </aside>
        <main>
          <header class="topbar">
            <span>Customer care, with a human touch.</span
            ><span class="local-label">● Local assistance available</span>
          </header>
          @if (error) {
            <p class="error" role="alert">{{ error }}</p>
          }
          <router-outlet />
        </main>
      </div>
    } @else {
      <router-outlet />
    }`,
})
export class App {
  api = inject(Api);
  router = inject(Router);
  error = '';
  async logout() {
    try {
      await this.api.logout();
      await this.router.navigateByUrl('/login');
    } catch (e) {
      this.error = errorText(e);
    }
  }
}
