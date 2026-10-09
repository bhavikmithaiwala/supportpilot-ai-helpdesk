import { ChangeDetectorRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Api, User, errorText } from '../../core/api';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<section class="page">
    <div class="page-heading">
      <div>
        <span class="eyebrow">WORKSPACE ADMINISTRATION</span>
        <h1>People & access</h1>
        <p class="muted">Provision accounts and keep workspace access current.</p>
      </div>
    </div>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (success) {
      <p class="success" role="status">{{ success }}</p>
    }
    <div class="admin-grid">
      <section class="panel">
        <div class="panel-heading">
          <strong>Workspace users · {{ total }}</strong>
        </div>
        @if (busy) {
          <p role="status">Loading users…</p>
        }
        @for (u of users; track u.id) {
          <div class="user-row">
            <span class="avatar">{{ u.name.slice(0, 1) }}</span>
            <div>
              <strong>{{ u.name }}</strong
              ><small class="muted">{{ u.email }}</small>
            </div>
            <span class="pill">{{ u.role }}</span
            ><span>{{ u.active ? 'Active' : 'Inactive' }}</span
            ><label class="small"
              >Role<select
                [value]="u.role"
                [disabled]="u.id === api.user()?.id || saving"
                (change)="changeRole(u, $event)"
              >
                <option>customer</option>
                <option>agent</option>
                <option>admin</option>
              </select></label
            ><button
              class="secondary"
              [disabled]="u.id === api.user()?.id || saving"
              (click)="toggle(u)"
            >
              {{ u.active ? 'Deactivate' : 'Activate' }}
            </button>
          </div>
        }
        <div class="pagination">
          <button
            class="secondary"
            [disabled]="page === 1 || busy"
            (click)="page = page - 1; load()"
          >
            Previous</button
          ><span>Page {{ page }}</span
          ><button
            class="secondary"
            [disabled]="page * 20 >= total || busy"
            (click)="page = page + 1; load()"
          >
            Next
          </button>
        </div>
      </section>
      <form class="panel form-panel" [formGroup]="form" (ngSubmit)="create()">
        <h2>Create account</h2>
        <label>Name<input formControlName="name" maxlength="80" /></label
        ><label>Email<input type="email" formControlName="email" autocomplete="off" /></label
        ><label
          >Role<select formControlName="role">
            <option>customer</option>
            <option>agent</option>
            <option>admin</option>
          </select></label
        ><label
          >Initial password<input
            type="password"
            formControlName="password"
            autocomplete="new-password"
            minlength="12"
            maxlength="128"
        /></label>
        <p class="muted small">
          At least 12 characters. Share credentials securely outside this app.
        </p>
        <button class="primary full" [disabled]="form.invalid || saving">Create account</button>
      </form>
    </div>
  </section>`,
})
export class Users {
  private cdr = inject(ChangeDetectorRef);
  api = inject(Api);
  form = inject(FormBuilder).nonNullable.group({
    name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    role: 'agent',
    password: ['', [Validators.required, Validators.minLength(12), Validators.maxLength(128)]],
  });
  users: User[] = [];
  page = 1;
  total = 0;
  busy = false;
  saving = false;
  error = '';
  success = '';
  constructor() {
    void this.load();
  }
  async load() {
    this.busy = true;
    try {
      const r = await this.api.get<User[]>(`/users?page=${this.page}`);
      this.users = r.data;
      this.total = r.pagination?.total || 0;
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.busy = false;
    }
  }
  async create() {
    if (this.form.invalid) return;
    this.saving = true;
    this.error = '';
    try {
      await this.api.post('/users', this.form.getRawValue());
      this.form.reset({ role: 'agent' });
      this.success = 'Account created.';
      await this.load();
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.saving = false;
    }
  }
  async update(u: User, input: unknown) {
    this.saving = true;
    this.error = '';
    try {
      await this.api.patch(`/users/${u.id}`, input);
      await this.load();
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.saving = false;
    }
  }
  toggle(u: User) {
    void this.update(u, { active: !u.active });
  }
  changeRole(u: User, event: Event) {
    void this.update(u, { role: (event.target as HTMLSelectElement).value });
  }
}
