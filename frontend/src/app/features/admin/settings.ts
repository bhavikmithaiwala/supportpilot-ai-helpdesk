import { ChangeDetectorRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Api, errorText } from '../../core/api';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [ReactiveFormsModule],
  template: `<section class="page narrow">
    <span class="eyebrow">WORKSPACE ADMINISTRATION</span>
    <h1>Settings</h1>
    <form class="panel form-panel" [formGroup]="form" (ngSubmit)="save()">
      <h2>Response reminders</h2>
      <label
        >Overdue threshold (hours)<input
          type="number"
          min="1"
          max="168"
          formControlName="overdueHours"
      /></label>
      <p class="muted">
        Tickets awaiting a first public staff reply show an overdue indicator after this threshold.
        This is a reminder, not a contractual SLA.
      </p>
      <button class="primary" [disabled]="form.invalid || busy">Save settings</button>
      @if (message) {
        <p role="status">{{ message }}</p>
      }
      @if (error) {
        <p class="error" role="alert">{{ error }}</p>
      }
    </form>
    <section class="panel form-panel">
      <h2>Optional cloud assistance</h2>
      <p>Cloud provider: {{ cloudEnabled ? 'enabled by server configuration' : 'disabled' }}</p>
      <p class="muted">
        Local templates always work. Gemini requires backend environment configuration and separate
        staff consent for each request. API keys stay on the server.
      </p>
    </section>
  </section>`,
})
export class Settings {
  private cdr = inject(ChangeDetectorRef);
  api = inject(Api);
  form = inject(FormBuilder).nonNullable.group({
    overdueHours: [24, [Validators.min(1), Validators.max(168)]],
  });
  cloudEnabled = false;
  busy = false;
  message = '';
  error = '';
  constructor() {
    void this.api
      .get<{ overdueHours: number; cloudEnabled: boolean }>('/settings')
      .then((r) => {
        this.form.patchValue(r.data);
        this.cloudEnabled = r.data.cloudEnabled;
      })
      .catch((e) => (this.error = errorText(e)))
      .finally(() => this.cdr.markForCheck());
  }
  async save() {
    this.busy = true;
    try {
      await this.api.patch('/settings', this.form.getRawValue());
      this.message = 'Settings saved.';
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.busy = false;
    }
  }
}
