import { ChangeDetectorRef, ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { DecimalPipe } from '@angular/common';
import { Api, errorText } from '../../core/api';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [ReactiveFormsModule, DecimalPipe],
  template: `<section class="page">
    <div class="page-heading">
      <div>
        <span class="eyebrow">THE BIGGER PICTURE</span>
        <h1>Support analytics</h1>
        <p class="muted">Real ticket data. Clearer decisions.</p>
      </div>
      <a class="button secondary" href="/api/reports/tickets.csv">Export tickets CSV</a>
    </div>
    <form class="filter-bar" [formGroup]="dates" (ngSubmit)="load()">
      <label>From<input type="date" formControlName="from" /></label
      ><label>To<input type="date" formControlName="to" /></label
      ><button class="secondary">Apply date range</button>
    </form>
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
    @if (busy) {
      <p role="status">Calculating metrics…</p>
    }
    @if (data) {
      <div class="metrics">
        <article class="panel metric">
          <span class="muted">Total tickets</span><strong>{{ metrics.total || 0 }}</strong>
        </article>
        <article class="panel metric">
          <span class="muted">Active backlog</span><strong>{{ metrics.backlog || 0 }}</strong>
        </article>
        <article class="panel metric">
          <span class="muted">Average first response</span
          ><strong>{{
            metrics.firstResponseMs == null
              ? '—'
              : (metrics.firstResponseMs / 3600000 | number: '1.1-1') + ' h'
          }}</strong>
        </article>
        <article class="panel metric">
          <span class="muted">Average resolution</span
          ><strong>{{
            metrics.resolutionMs == null
              ? '—'
              : (metrics.resolutionMs / 3600000 | number: '1.1-1') + ' h'
          }}</strong>
        </article>
      </div>
      <div class="analytics-grid">
        <section class="panel chart">
          <h2>Tickets by status</h2>
          @for (row of data.statuses; track row._id) {
            <div class="bar-row">
              <span>{{ row._id.replaceAll('_', ' ') }}</span>
              <div class="bar-track">
                <div class="bar" [style.width.%]="(row.count / (metrics.total || 1)) * 100"></div>
              </div>
              <strong>{{ row.count }}</strong>
            </div>
          }
          @if (!data.statuses.length) {
            <p class="muted">No tickets in this date range.</p>
          }
        </section>
        <section class="panel chart">
          <h2>Tickets by category</h2>
          @for (row of data.categories; track row._id) {
            <div class="bar-row">
              <span>{{ row._id }}</span>
              <div class="bar-track">
                <div
                  class="bar teal"
                  [style.width.%]="(row.count / (metrics.total || 1)) * 100"
                ></div>
              </div>
              <strong>{{ row.count }}</strong>
            </div>
          }
        </section>
        <section class="panel chart trend">
          <h2>Daily ticket volume</h2>
          @for (row of data.trends; track row._id) {
            <div class="bar-row">
              <span>{{ row._id }}</span>
              <div class="bar-track">
                <div class="bar" [style.width.%]="(row.count / maxTrend) * 100"></div>
              </div>
              <strong>{{ row.count }}</strong>
            </div>
          }
        </section>
      </div>
      <p class="muted small">
        First response counts the first human staff public reply. Resolution uses the current
        resolution timestamp; reopening clears it. Date filters select tickets by creation time.
        Export includes up to 10,000 tickets across all dates.
      </p>
    }
  </section>`,
})
export class Analytics {
  private cdr = inject(ChangeDetectorRef);
  api = inject(Api);
  dates = inject(FormBuilder).nonNullable.group({ from: '', to: '' });
  data: any;
  metrics: any = {};
  busy = false;
  error = '';
  get maxTrend() {
    return Math.max(1, ...(this.data?.trends || []).map((r: any) => r.count));
  }
  constructor() {
    void this.load();
  }
  async load() {
    this.busy = true;
    this.error = '';
    try {
      const query = new URLSearchParams();
      const { from, to } = this.dates.getRawValue();
      if (from) query.set('from', new Date(from).toISOString());
      if (to) query.set('to', new Date(`${to}T23:59:59.999Z`).toISOString());
      this.data = (await this.api.get(`/analytics/summary?${query}`)).data;
      this.metrics = this.data.metrics[0] || {};
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.busy = false;
    }
  }
}
