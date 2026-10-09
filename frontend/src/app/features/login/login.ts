import { ChangeDetectorRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, errorText } from '../../core/api';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<div class="login-layout">
    <section class="login-story">
      <a class="brand" href="/"><span class="brand-icon">S</span> SupportPilot</a>
      <div>
        <span class="eyebrow">BUILT FOR BETTER CONVERSATIONS</span>
        <h1>Every question deserves<br />a thoughtful answer.</h1>
        <p>
          One workspace for your support team. Clear priorities, connected conversations, and
          helpful drafts you control.
        </p>
        <div class="story-card">
          <span class="pill">Human reviewed</span>
          <h3>A little assistance.<br />A lot of care.</h3>
          <p>Local suggestions work without an AI key. Your team always decides what to send.</p>
        </div>
      </div>
      <small>SupportPilot · AI-assisted customer support</small>
    </section>
    <section class="login-form">
      <form [formGroup]="form" (ngSubmit)="submit()">
        <span class="eyebrow">WELCOME BACK</span>
        <h2>Sign in to your workspace</h2>
        <p class="muted">Use the account provisioned by your administrator.</p>
        <label
          >Email address<input
            type="email"
            formControlName="email"
            autocomplete="username"
            placeholder="you@example.test" /></label
        ><label
          >Password<input
            type="password"
            formControlName="password"
            autocomplete="current-password"
        /></label>
        @if (error) {
          <p class="error" role="alert">{{ error }}</p>
        }
        <button class="primary full" [disabled]="form.invalid || busy">
          {{ busy ? 'Signing in…' : 'Sign in →' }}
        </button>
        <p class="muted small">
          Local demo accounts are created using the seed command. Credentials are configured
          locally.
        </p>
      </form>
    </section>
  </div>`,
})
export class Login {
  private cdr = inject(ChangeDetectorRef);
  private api = inject(Api);
  private router = inject(Router);
  form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });
  busy = false;
  error = '';
  async submit() {
    if (this.form.invalid) return;
    this.busy = true;
    this.error = '';
    try {
      const { email, password } = this.form.getRawValue();
      await this.api.login(email, password);
      await this.router.navigateByUrl('/tickets');
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.busy = false;
    }
  }
}
