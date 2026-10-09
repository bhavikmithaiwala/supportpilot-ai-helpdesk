import 'zone.js';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { Login } from './login';
import { Api } from '../../core/api';
describe('login interactions', () => {
  const login = vi.fn();
  beforeEach(() => {
    login.mockReset();
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), { provide: Api, useValue: { login } }],
    });
  });
  it('requires valid email and a password before sending', async () => {
    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    const component = fixture.componentInstance;
    await component.submit();
    expect(login).not.toHaveBeenCalled();
    component.form.setValue({ email: 'invalid', password: 'p' });
    expect(component.form.invalid).toBe(true);
  });
  it('submits credentials and navigates after success', async () => {
    const fixture = TestBed.createComponent(Login);
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture.componentInstance.form.setValue({
      email: 'fictional@example.test',
      password: 'local-only-test',
    });
    await fixture.componentInstance.submit();
    expect(login).toHaveBeenCalledWith('fictional@example.test', 'local-only-test');
    expect(navigate).toHaveBeenCalledWith('/tickets');
  });
  it('shows a failure and permits retry', async () => {
    const fixture = TestBed.createComponent(Login);
    login.mockRejectedValue(new Error('offline'));
    fixture.componentInstance.form.setValue({ email: 'fictional@example.test', password: 'test' });
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('retry');
    expect(fixture.componentInstance.busy).toBe(false);
  });
});
