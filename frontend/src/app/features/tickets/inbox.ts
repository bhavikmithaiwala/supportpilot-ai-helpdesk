import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  inject,
  effect,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder } from '@angular/forms';
import { Api, Ticket, errorText } from '../../core/api';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [RouterLink, DatePipe, ReactiveFormsModule],
  template: `<section class="page">
    <div class="page-heading">
      <div>
        <span class="eyebrow">YOUR SUPPORT DESK</span>
        <h1>{{ api.user()?.role === 'customer' ? 'My tickets' : 'Ticket inbox' }}</h1>
        <p class="muted">Keep every conversation moving forward.</p>
      </div>
      <a class="button primary" routerLink="/new">＋ New ticket</a>
    </div>
    <form class="filter-bar" [formGroup]="filters" (ngSubmit)="page = 1; load()">
      <label class="search"
        >Search tickets<input formControlName="search" placeholder="Search by subject…" /></label
      ><label
        >Status<select formControlName="status">
          <option value="">All statuses</option>
          @for (s of statuses; track s) {
            <option [value]="s">{{ label(s) }}</option>
          }
        </select></label
      ><label
        >Priority<select formControlName="priority">
          <option value="">All priorities</option>
          @for (p of ['low', 'medium', 'high']; track p) {
            <option>{{ p }}</option>
          }
        </select></label
      >
      @if (api.user()?.role !== 'customer') {
        <label
          >Assignment<select formControlName="assigned">
            <option value="">Everyone</option>
            <option value="me">Assigned to me</option>
            <option value="unassigned">Unassigned</option>
          </select></label
        >
      }
      <label
        >Sort<select formControlName="sort">
          <option value="updated">Recently updated</option>
          <option value="created">Newest</option>
          <option value="oldest">Oldest</option>
        </select></label
      ><button class="secondary">Apply</button>
    </form>
    @if (error) {
      <p class="error" role="alert">{{ error }} <button (click)="load()">Retry</button></p>
    }
    @if (busy) {
      <p role="status">Loading tickets…</p>
    }
    <div class="panel">
      <div class="panel-heading">
        <strong>{{ total }} tickets</strong
        ><span class="muted small">Updates arrive automatically</span>
      </div>
      @if (!busy && !tickets.length) {
        <div class="empty">
          <span>▤</span>
          <h2>All clear here</h2>
          <p>No tickets match your filters. Create a ticket or change the filters.</p>
        </div>
      }
      @for (t of tickets; track t._id) {
        <a class="ticket-row" [routerLink]="['/tickets', t._id]"
          ><span class="ticket-mark" [class.unread]="t.unread">{{ t.unread ? '●' : '○' }}</span>
          <div class="ticket-summary">
            <span class="small muted"
              >{{ t.ticketNumber }}
              @if (t.overdue) {
                <span class="overdue">· Response overdue</span>
              }</span
            ><strong>{{ t.subject }}</strong
            ><span class="small muted"
              >{{ t.category }} · {{ t.createdAt | date: 'mediumDate' }}</span
            >
          </div>
          <span class="pill" [class.high]="t.priority === 'high'">{{ t.priority }}</span
          ><span class="pill status" [attr.data-status]="t.status">{{ label(t.status) }}</span
          ><time class="small muted">{{ t.updatedAt | date: 'short' }}</time
          ><span>→</span></a
        >
      }
    </div>
    <div class="pagination">
      <button class="secondary" [disabled]="page === 1 || busy" (click)="page = page - 1; load()">
        Previous</button
      ><span>Page {{ page }} of {{ pages }}</span
      ><button
        class="secondary"
        [disabled]="page >= pages || busy"
        (click)="page = page + 1; load()"
      >
        Next
      </button>
    </div>
  </section>`,
})
export class Inbox {
  private cdr = inject(ChangeDetectorRef);
  api = inject(Api);
  filters = inject(FormBuilder).nonNullable.group({
    search: '',
    status: '',
    priority: '',
    assigned: '',
    sort: 'updated',
  });
  statuses = ['new', 'open', 'waiting_on_customer', 'resolved', 'closed'];
  tickets: Ticket[] = [];
  page = 1;
  total = 0;
  busy = false;
  error = '';
  get pages() {
    return Math.max(1, Math.ceil(this.total / 20));
  }
  label(s: string) {
    return s.replaceAll('_', ' ');
  }
  constructor() {
    effect(() => {
      this.api.changed();
      void this.load();
    });
  }
  async load() {
    this.busy = true;
    this.error = '';
    const query = new URLSearchParams({ page: String(this.page), limit: '20' });
    for (const [k, v] of Object.entries(this.filters.getRawValue())) if (v) query.set(k, v);
    try {
      const result = await this.api.get<Ticket[]>(`/tickets?${query}`);
      this.tickets = result.data;
      this.total = result.pagination?.total || 0;
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.busy = false;
    }
  }
}
