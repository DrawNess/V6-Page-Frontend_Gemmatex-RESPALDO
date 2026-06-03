import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { AuthService } from '@shared/services/auth.service';
import { SsoSession } from '@shared/models/auth.model';
import { parseApiError } from '@core/utils/parse-api-error';

function matchPasswords(a: string, b: string): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const p1 = ctrl.get(a)?.value;
    const p2 = ctrl.get(b)?.value;
    return p1 === p2 ? null : { mismatch: true };
  };
}

@Component({
  selector: 'app-security',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './security.component.html',
})
export class SecurityComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  // ── Change password ───────────────────────────────────────
  pwdLoading = false;
  pwdError = '';
  pwdSuccess = '';
  showCurrent = false;
  showNew = false;
  showConfirm = false;

  pwdForm = this.fb.nonNullable.group(
    {
      current_password: ['', [Validators.required, Validators.minLength(8)]],
      new_password: ['', [Validators.required, Validators.minLength(8)]],
      confirm_password: ['', [Validators.required]],
    },
    { validators: [matchPasswords('new_password', 'confirm_password')] }
  );

  // ── Sessions ──────────────────────────────────────────────
  sessions: SsoSession[] = [];
  sessionsLoading = false;
  sessionsError = '';
  revokingId: string | null = null;
  logoutOthersLoading = false;
  logoutOthersSuccess = '';

  ngOnInit(): void {
    this.loadSessions();
  }

  get f() {
    return this.pwdForm.controls;
  }

  changePassword(): void {
    this.pwdError = '';
    this.pwdSuccess = '';

    if (this.pwdForm.invalid) {
      this.pwdForm.markAllAsTouched();
      return;
    }

    const { current_password, new_password } = this.pwdForm.getRawValue();
    this.pwdLoading = true;

    this.authService
      .changePasswordAuthenticated(current_password, new_password)
      .pipe(
        finalize(() => (this.pwdLoading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.pwdSuccess = res.message || 'Contraseña actualizada correctamente.';
          this.pwdForm.reset();
        },
        error: (err) => {
          this.pwdError = parseApiError(err, {
            statusMessages: {
              401: 'Contraseña actual incorrecta.',
              400: 'Revisa los datos ingresados.',
              422: 'La nueva contraseña no puede ser igual a una reciente.',
            },
          });
        },
      });
  }

  loadSessions(): void {
    this.sessionsLoading = true;
    this.sessionsError = '';

    this.authService
      .getSessions()
      .pipe(
        finalize(() => (this.sessionsLoading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => (this.sessions = res.items ?? []),
        error: () => (this.sessionsError = 'No se pudieron cargar las sesiones.'),
      });
  }

  revokeSession(session: SsoSession): void {
    if (session.is_current || this.revokingId) return;
    this.revokingId = session.id;

    this.authService
      .revokeSession(session.id)
      .pipe(
        finalize(() => (this.revokingId = null)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: () => {
          this.sessions = this.sessions.filter((s) => s.id !== session.id);
        },
        error: () => {},
      });
  }

  logoutOthers(): void {
    this.logoutOthersLoading = true;
    this.logoutOthersSuccess = '';

    this.authService
      .logoutOtherSessions()
      .pipe(
        finalize(() => (this.logoutOthersLoading = false)),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe({
        next: (res) => {
          this.logoutOthersSuccess = `Se cerraron ${res.revoked} sesión(es) activa(s).`;
          this.sessions = this.sessions.filter((s) => s.is_current);
        },
        error: () => {},
      });
  }

  formatDate(iso: string): string {
    return new Date(iso).toLocaleString('es-BO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  parseUserAgent(ua: string | null): string {
    if (!ua) return 'Dispositivo desconocido';
    if (/mobile/i.test(ua)) return 'Móvil';
    if (/tablet/i.test(ua)) return 'Tablet';
    return 'Computadora';
  }
}
