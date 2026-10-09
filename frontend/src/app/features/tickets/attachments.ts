import {
  ChangeDetectorRef,
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  effect,
} from '@angular/core';
import { Api, errorText } from '../../core/api';
@Component({
  changeDetection: ChangeDetectionStrategy.Default,
  selector: 'sp-attachments',
  standalone: true,
  template: `<section class="panel form-panel">
    <h2>Attachments</h2>
    <p class="muted small">
      Public ticket evidence: UTF-8 .txt files, up to 16 KiB each and 10 per ticket. Downloaded as
      files. Do not include secrets or private staff notes.
    </p>
    @for (file of files; track file._id) {
      <p>
        <a class="back" [href]="'/api/attachments/' + file._id"
          >↓ {{ file.name }} ({{ file.size }} bytes)</a
        >
      </p>
    }
    @if (!files.length) {
      <p class="muted small">No attachments yet.</p>
    }
    @if (!readonly()) {
      <label
        >Add a text file<input
          type="file"
          accept=".txt,text/plain"
          [disabled]="busy"
          (change)="upload($event)"
      /></label>
    }
    @if (busy) {
      <p role="status">Uploading…</p>
    }
    @if (error) {
      <p class="error" role="alert">{{ error }}</p>
    }
  </section>`,
})
export class Attachments {
  private cdr = inject(ChangeDetectorRef);
  api = inject(Api);
  ticketId = input.required<string>();
  readonly = input(false);
  files: { _id: string; name: string; size: number }[] = [];
  busy = false;
  error = '';
  constructor() {
    effect(() => {
      this.api.changed();
      void this.load();
    });
  }
  async load() {
    try {
      this.files = (
        await this.api.get<typeof this.files>(`/tickets/${this.ticketId()}/attachments`)
      ).data;
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
    }
  }
  async upload(event: Event) {
    const element = event.target as HTMLInputElement;
    const file = element.files?.[0];
    if (!file) return;
    this.error = '';
    if (file.size > 16384 || !file.name.endsWith('.txt')) {
      this.error = 'Choose a .txt file no larger than 16 KiB.';
      element.value = '';
      return;
    }
    this.busy = true;
    try {
      const content = new TextDecoder('utf-8', { fatal: true }).decode(await file.arrayBuffer());
      await this.api.post(`/tickets/${this.ticketId()}/attachments`, { name: file.name, content });
      await this.load();
    } catch (e) {
      this.error = errorText(e);
    } finally {
      this.cdr.markForCheck();
      this.busy = false;
      element.value = '';
    }
  }
}
