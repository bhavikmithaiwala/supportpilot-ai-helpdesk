import { Attachments } from './attachments';
import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  inject,
  effect,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe, JsonPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Api, Ticket, Message, errorText } from '../../core/api';
interface Suggestion {
  text: string;
  provider: string;
  category: string;
  priority: string;
  explanations: string[];
  notice?: string;
  draftId: string;
}
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, DatePipe, JsonPipe, Attachments],
  template: `<section class="page">
    <a routerLink="/tickets" class="back">← Back to inbox</a>
    @if (error) {
      <p class="error" role="alert">{{ error }} <button (click)="load()">Refresh</button></p>
    }
    @if (busy) {
      <p role="status">Loading conversation…</p>
    }
    @if (ticket; as t) {
      <div class="page-heading">
        <div>
          <span class="eyebrow">{{ t.ticketNumber }}</span>
          <h1>{{ t.subject }}</h1>
          <p class="muted">
            Created {{ t.createdAt | date: 'medium' }} ·
            <span class="pill status" [attr.data-status]="t.status">{{ label(t.status) }}</span>
          </p>
        </div>
      </div>
      <div class="detail-grid">
        <div>
          <section class="panel conversation">
            <div class="panel-heading">
              <strong>Conversation</strong
              ><span class="muted small">{{ messages.length }} messages</span>
            </div>
            @for (m of messages; track m._id) {
              <article class="message" [class.internal]="m.visibility === 'internal'">
                <div class="message-heading">
                  <span class="avatar">{{ m.authorId.name.slice(0, 1) }}</span
                  ><strong>{{ m.authorId.name }}</strong
                  ><span class="muted small">{{ m.authorId.role }}</span>
                  @if (m.visibility === 'internal') {
                    <span class="pill">Internal note · staff only</span>
                  }
                  <time class="muted small">{{ m.createdAt | date: 'short' }}</time>
                </div>
                <p class="message-body">{{ m.body }}</p>
              </article>
            }
          </section>
          <form class="panel composer" [formGroup]="reply" (ngSubmit)="send()">
            <div class="composer-tabs">
              <button type="button" [class.active]="!internal" (click)="internal = false">
                Public reply
              </button>
              @if (staff) {
                <button type="button" [class.active]="internal" (click)="internal = true">
                  Internal note
                </button>
              }
            </div>
            <label
              >{{ internal ? 'Private note for staff' : 'Your reply'
              }}<textarea
                rows="5"
                formControlName="body"
                maxlength="10000"
                placeholder="Write a thoughtful response…"
              ></textarea>
            </label>
            @if (internal) {
              <p class="small muted">Only agents and administrators can read this note.</p>
            }
            @if (t.status === 'closed' && !staff) {
              <p class="muted">This ticket is closed and read only.</p>
            }
            <div class="actions">
              <span class="muted small">Messages are sent only when you press Send.</span
              ><button
                class="primary"
                [disabled]="reply.invalid || saving || (!staff && t.status === 'closed')"
              >
                {{ saving ? 'Saving…' : internal ? 'Add internal note' : 'Send reply' }}
              </button>
            </div>
          </form>
          @if (staff) {
            <section class="panel timeline">
              <h2>Activity</h2>
              @for (event of events; track event._id) {
                <div class="event">
                  <strong>{{ label(event.type) }}</strong
                  ><span class="muted small"
                    >{{ event.actorId?.name }} · {{ event.createdAt | date: 'short' }}</span
                  >
                  @if (event.after) {
                    <pre>{{ event.after | json }}</pre>
                  }
                </div>
              }
            </section>
          }
        </div>
        <aside class="detail-aside">
          <sp-attachments [ticketId]="id" [readonly]="t.status === 'closed' && !staff" />
          <section class="panel form-panel">
            <h2>Ticket details</h2>
            @if (staff) {
              <form [formGroup]="controls" (ngSubmit)="update()">
                <label
                  >Assigned to<select formControlName="assignedAgentId">
                    <option value="">Unassigned</option>
                    @for (user of agents; track user.id) {
                      <option [value]="user.id">{{ user.name }}</option>
                    }
                  </select></label
                ><label
                  >Status<select formControlName="status">
                    @for (s of statuses; track s) {
                      <option [value]="s">{{ label(s) }}</option>
                    }
                  </select></label
                ><label
                  >Category<select formControlName="category">
                    @for (c of categories; track c) {
                      <option>{{ c }}</option>
                    }
                  </select></label
                ><label
                  >Priority<select formControlName="priority">
                    @for (p of ['low', 'medium', 'high']; track p) {
                      <option>{{ p }}</option>
                    }
                  </select></label
                >
                @if (t.status === 'closed') {
                  <label
                    >Reason for reopening<input formControlName="reason" maxlength="500"
                  /></label>
                }
                <button class="secondary full" [disabled]="saving">Save changes</button>
              </form>
            } @else {
              <dl>
                <dt>Category</dt>
                <dd>{{ t.category }}</dd>
                <dt>Priority</dt>
                <dd>{{ t.priority }}</dd>
                <dt>Last updated</dt>
                <dd>{{ t.updatedAt | date: 'medium' }}</dd>
              </dl>
            }
          </section>
          @if (staff) {
            <section class="panel assistance">
              <span class="eyebrow">HUMAN IN CONTROL</span>
              <h2>Reply assistance</h2>
              <p class="muted small">
                Get an editable local template and explainable triage. Drafts are never sent
                automatically.
              </p>
              <button class="secondary full" [disabled]="saving" (click)="draft(false)">
                Suggest a local reply
              </button>
              <form [formGroup]="consent">
                <label class="checkbox"
                  ><input type="checkbox" formControlName="accepted" />I consent to sending redacted
                  subject and description to Gemini. Other sensitive details may remain; review the
                  ticket first.</label
                >
              </form>
              <button
                class="text-button"
                [disabled]="saving || !consent.value.accepted"
                (click)="draft(true)"
              >
                Request optional Gemini draft
              </button>
              @if (suggestion; as s) {
                <span class="pill">{{ s.provider }} draft</span>
                @if (s.notice) {
                  <p class="small" role="status">{{ s.notice }}</p>
                }
                <p>
                  <strong>{{ s.category }} · {{ s.priority }}</strong>
                </p>
                @for (reason of s.explanations; track reason) {
                  <p class="muted small">{{ reason }}</p>
                }
                <p class="draft-preview">{{ s.text }}</p>
                <button class="secondary full" (click)="applyTriage()" [disabled]="saving">
                  Use suggested category & priority
                </button>
                <div class="actions">
                  <button class="secondary" (click)="useDraft()" [disabled]="saving">
                    Edit reply</button
                  ><button class="text-button" (click)="reject()" [disabled]="saving">
                    Dismiss
                  </button>
                </div>
              }
            </section>
          }
        </aside>
      </div>
    }
  </section>`,
})
export class Detail implements OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  api = inject(Api);
  id = inject(ActivatedRoute).snapshot.paramMap.get('id')!;
  fb = inject(FormBuilder);
  ticket?: Ticket;
  messages: Message[] = [];
  events: any[] = [];
  agents: { id: string; name: string }[] = [];
  statuses = ['new', 'open', 'waiting_on_customer', 'resolved', 'closed'];
  categories = ['billing', 'technical', 'account', 'general', 'other'];
  busy = false;
  saving = false;
  internal = false;
  error = '';
  suggestion?: Suggestion;
  reply = this.fb.nonNullable.group({
    body: ['', [Validators.required, Validators.maxLength(10000)]],
  });
  controls = this.fb.nonNullable.group({
    status: '',
    category: '',
    priority: '',
    assignedAgentId: '',
    reason: '',
  });
  consent = this.fb.nonNullable.group({ accepted: false });
  get staff() {
    return this.api.user()?.role !== 'customer';
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
  ngOnDestroy() {
    this.api.socket?.emit('unsubscribe', this.id);
  }
  async load() {
    this.busy = true;
    try {
      const { data } = await this.api.get<{ ticket: Ticket; messages: Message[] }>(
        `/tickets/${this.id}`,
      );
      this.ticket = data.ticket;
      this.messages = data.messages;
      this.controls.patchValue({
        status: data.ticket.status,
        category: data.ticket.category,
        priority: data.ticket.priority,
        assignedAgentId: data.ticket.assignedAgentId || '',
      });
      this.api.socket?.emit('subscribe', this.id);
      if (this.staff) {
        const [events, agents] = await Promise.all([
          this.api.get<any[]>(`/tickets/${this.id}/events`),
          this.api.get<{ id: string; name: string }[]>('/staff'),
        ]);
        this.events = events.data;
        this.agents = agents.data;
      }
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.busy = false;
    }
  }
  async action(fn: () => Promise<unknown>) {
    this.saving = true;
    this.error = '';
    try {
      await fn();
      await this.load();
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.saving = false;
    }
  }
  async send() {
    if (this.reply.invalid || !this.ticket) return;
    await this.action(async () => {
      await this.api.post(
        `/tickets/${this.id}/${this.internal ? 'notes' : this.staff ? 'replies' : 'messages'}`,
        { body: this.reply.getRawValue().body, version: this.ticket!.__v },
      );
      this.reply.reset();
    });
  }
  async update() {
    if (!this.ticket) return;
    const v = this.controls.getRawValue();
    await this.action(() =>
      this.api.patch(`/tickets/${this.id}`, {
        version: this.ticket!.__v,
        status: v.status !== this.ticket!.status ? v.status : undefined,
        category: v.category,
        priority: v.priority,
        assignedAgentId: v.assignedAgentId || null,
        ...(v.reason ? { reason: v.reason } : {}),
      }),
    );
  }
  async draft(cloud: boolean) {
    await this.action(async () => {
      this.suggestion = (
        await this.api.post<Suggestion>(`/tickets/${this.id}/suggestions`, {
          cloud,
          consent: this.consent.getRawValue().accepted,
        })
      ).data;
    });
  }
  async useDraft() {
    if (!this.suggestion) return;
    await this.action(async () => {
      await this.api.post(
        `/tickets/${this.id}/suggestions/${this.suggestion!.draftId}/approve`,
        {},
      );
      this.reply.setValue({ body: this.suggestion!.text });
      this.internal = false;
      this.suggestion = undefined;
    });
  }
  async reject() {
    if (!this.suggestion) return;
    await this.action(async () => {
      await this.api.post(`/tickets/${this.id}/suggestions/${this.suggestion!.draftId}/reject`, {});
      this.suggestion = undefined;
    });
  }
  async applyTriage() {
    if (!this.suggestion) return;
    this.controls.patchValue({
      category: this.suggestion.category,
      priority: this.suggestion.priority,
    });
    await this.update();
  }
}
