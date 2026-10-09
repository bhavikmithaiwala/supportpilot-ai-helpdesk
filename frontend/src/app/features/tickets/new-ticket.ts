import { ChangeDetectorRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Api, Ticket, errorText } from '../../core/api';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  template: `<section class="page narrow">
    <a routerLink="/tickets" class="back">← Back to tickets</a>
    <div class="page-heading">
      <div>
        <span class="eyebrow">LET’S GET IT SORTED</span>
        <h1>Create a ticket</h1>
        <p class="muted">Tell us what happened. Our team will take it from here.</p>
      </div>
    </div>
    <form class="panel form-panel" [formGroup]="form" (ngSubmit)="submit()">
      <label
        >Subject<input
          formControlName="subject"
          maxlength="160"
          placeholder="A short summary of your question" /></label
      ><label
        >Description<textarea
          formControlName="description"
          rows="8"
          maxlength="10000"
          placeholder="Include what you expected, what happened, and any helpful context."
        ></textarea>
      </label>
      <p class="muted small">
        Please don’t include passwords, access tokens or payment card details.
      </p>
      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
      <div class="actions">
        <a class="button secondary" routerLink="/tickets">Cancel</a
        ><button class="primary" [disabled]="form.invalid || busy">
          {{ busy ? 'Creating…' : 'Create ticket' }}
        </button>
      </div>
    </form>
  </section>`,
})
export class NewTicket {
  private cdr = inject(ChangeDetectorRef);
  api = inject(Api);
  router = inject(Router);
  form = inject(FormBuilder).nonNullable.group({
    subject: ['', [Validators.required, Validators.maxLength(160)]],
    description: ['', [Validators.required, Validators.maxLength(10000)]],
  });
  busy = false;
  error = '';
  async submit() {
    if (this.form.invalid) return;
    this.busy = true;
    try {
      const { data } = await this.api.post<Ticket>('/tickets', this.form.getRawValue());
      await this.router.navigate(['/tickets', data._id]);
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.busy = false;
    }
  }
}
