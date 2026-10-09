import 'zone.js';
import { TestBed } from '@angular/core/testing';
import { provideRouter, ActivatedRoute, Router } from '@angular/router';
import { signal } from '@angular/core';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Api } from '../../core/api';
import { NewTicket } from './new-ticket';
import { Detail } from './detail';
describe('ticket form', () => {
  const post = vi.fn();
  beforeEach(() => {
    post.mockReset();
    TestBed.configureTestingModule({
      imports: [NewTicket],
      providers: [provideRouter([]), { provide: Api, useValue: { post } }],
    });
  });
  it('validates subject and description, then opens persisted ticket', async () => {
    const fixture = TestBed.createComponent(NewTicket);
    const c = fixture.componentInstance;
    await c.submit();
    expect(post).not.toHaveBeenCalled();
    post.mockResolvedValue({ data: { _id: 'persisted-id' } });
    const navigation = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    c.form.setValue({ subject: 'Invoice question', description: 'Please explain this invoice.' });
    await c.submit();
    expect(post).toHaveBeenCalledWith('/tickets', {
      subject: 'Invoice question',
      description: 'Please explain this invoice.',
    });
    expect(navigation).toHaveBeenCalledWith(['/tickets', 'persisted-id']);
  });
});
describe('conversation permissions and draft editing', () => {
  const ticket = {
    _id: 'id',
    ticketNumber: 'SP-TEST',
    subject: 'Test',
    status: 'open',
    category: 'billing',
    priority: 'medium',
    assignedAgentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    __v: 3,
  };
  const api = {
    user: signal<any>({ role: 'customer' }),
    changed: signal(0),
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    socket: { emit: vi.fn() },
  };
  beforeEach(() => {
    api.user.set({ role: 'customer' });
    api.post.mockReset();
    api.get.mockImplementation((path: string) =>
      Promise.resolve({
        data:
          path.includes('/events') || path === '/staff'
            ? []
            : {
                ticket,
                messages: [
                  {
                    _id: 'm',
                    body: '<script>alert(1)</script>',
                    visibility: 'public',
                    authorId: { name: 'Customer', role: 'customer' },
                    createdAt: new Date().toISOString(),
                  },
                ],
              },
      }),
    );
    TestBed.configureTestingModule({
      imports: [Detail],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => 'id' } } } },
        { provide: Api, useValue: api },
      ],
    });
  });
  it('hides staff controls and renders message text without HTML execution', async () => {
    const fixture = TestBed.createComponent(Detail);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).not.toContain('Internal note');
    expect(fixture.nativeElement.querySelector('.message-body').textContent).toContain('<script>');
    expect(fixture.nativeElement.querySelector('script')).toBeNull();
  });
  it('copies approved draft into editable form without sending a message', async () => {
    api.user.set({ role: 'agent' });
    api.post.mockResolvedValue({ data: {} });
    const fixture = TestBed.createComponent(Detail);
    const c = fixture.componentInstance;
    await c.load();
    c.suggestion = {
      draftId: 'draft',
      text: 'Editable suggestion',
      provider: 'local',
      category: 'billing',
      priority: 'medium',
      explanations: [],
    };
    await c.useDraft();
    expect(c.reply.getRawValue().body).toBe('Editable suggestion');
    expect(api.post).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledWith('/tickets/id/suggestions/draft/approve', {});
    c.reply.setValue({ body: 'Human revised reply' });
    await c.send();
    expect(api.post).toHaveBeenCalledWith('/tickets/id/replies', {
      body: 'Human revised reply',
      version: 3,
    });
  });
});
