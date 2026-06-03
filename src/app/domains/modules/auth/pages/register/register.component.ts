import { Component, DestroyRef, EventEmitter, inject, OnDestroy, Output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize, switchMap } from 'rxjs/operators';

import { AuthService } from '@shared/services/auth.service';
import { SessionService } from '@shared/services/session.service';
import { parseApiError } from '@core/utils/parse-api-error';

type RequestStatus = 'init' | 'loading' | 'success' | 'failed';

function matchPasswords(a: string, b: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const p1 = control.get(a)?.value;
    const p2 = control.get(b)?.value;
    return p1 === p2 ? null : { mismatch: true };
  };
}

function passwordStrength(minScore: number): ValidatorFn {
  return (ctrl: AbstractControl): ValidationErrors | null => {
    const val = (ctrl.value as string) ?? '';
    let score = 0;
    if (val.length >= 8) score++;
    if (/[A-Z]/.test(val)) score++;
    if (/\d/.test(val)) score++;
    if (/[^A-Za-z0-9\s]/.test(val)) score++;
    return score >= minScore ? null : { weakPassword: { score, required: minScore } };
  };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})

export class RegisterComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private redirectTimeoutId?: number;

  @Output() switchToLogin = new EventEmitter<void>();

  status: RequestStatus = 'init';
  errorMsg = '';

  // UI
  submitted = false;
  showPassword = false;
  capsLockOn = false;

  // Modal premium
  showSuccessModal = false;
  modalTitle = '';
  modalMsg = '';

  // Fuerza (si lo sigues usando)
  pwdScore = 0;
  pwdLabel = 'Débil';

  form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],
      phone: ['', [Validators.required, Validators.minLength(8)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), passwordStrength(2)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: [matchPasswords('password', 'confirmPassword')] }
  );

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private sessionService: SessionService
  ) {
    // Limpia error backend al editar
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => (this.errorMsg = ''));

    // Fuerza en vivo (opcional)
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((pwd) => {
        const s = this.calcPasswordScore(pwd || '');
        this.pwdScore = s;
        this.pwdLabel = s <= 1 ? 'Débil' : s === 2 ? 'Media' : s === 3 ? 'Buena' : 'Fuerte';
      });
  }

  ngOnDestroy(): void {
    if (this.redirectTimeoutId !== undefined) {
      window.clearTimeout(this.redirectTimeoutId);
    }
  }

  get loading() {
    return this.status === 'loading';
  }

  get f() {
    return this.form.controls;
  }

  onPasswordKey(e: KeyboardEvent) {
    this.capsLockOn = e.getModifierState?.('CapsLock') ?? false;
  }

  // reglas visuales (opcional)
  hasMinLen(p: string) { return (p ?? '').length >= 8; }
  hasUpper(p: string) { return /[A-Z]/.test(p ?? ''); }
  hasNumber(p: string) { return /\d/.test(p ?? ''); }
  hasSymbol(p: string) { return /[^A-Za-z0-9\s]/.test(p ?? ''); }
  calcPasswordScore(p: string) {
    let s = 0;
    if (this.hasMinLen(p)) s++;
    if (this.hasUpper(p)) s++;
    if (this.hasNumber(p)) s++;
    if (this.hasSymbol(p)) s++;
    return s;
  }

  getFormError(): string | null {
    if (!this.submitted) return null;

    if (this.f.terms.invalid) return 'Debes aceptar los términos y políticas para continuar.';
    if (this.form.hasError('mismatch')) return 'Las contraseñas no coinciden.';
    if (this.f.email.invalid) return 'Revisa el correo.';
    if (this.f.password.hasError('weakPassword')) return 'La contraseña debe incluir mayúscula, número o símbolo.';
    if (this.f.password.invalid) return 'Revisa la contraseña.';
    if (this.f.name.invalid) return 'Revisa el nombre.';
    if (this.f.lastName.invalid) return 'Revisa el apellido.';
    if (this.f.phone.invalid) return 'Revisa el teléfono.';
    return null;
  }

  private parseApiError(err: unknown): string {
    return parseApiError(err, {
      fallback: 'No se pudo registrar. Verifica los datos.',
      statusMessages: {
        409: 'Este correo ya está registrado.',
      },
    });
  }

  register() {
    this.submitted = true;
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status = 'loading';

    const { name, lastName, phone, email, password } = this.form.getRawValue();
    const normalizedEmail = email.trim().toLowerCase();
    // El SSO espera teléfono en formato +591########.
    const rawPhone = phone.trim().replace(/\s+/g, '');
    const normalizedPhone = rawPhone.startsWith('+591')
      ? rawPhone
      : rawPhone.startsWith('591')
      ? `+${rawPhone}`
      : `+591${rawPhone}`;

    // Payload SSO: campos planos snake_case. Email, password, first_name,
    // last_name y phone son obligatorios; el resto opcional.
    const payload = {
      email: normalizedEmail,
      password,
      first_name: name.trim(),
      last_name: lastName.trim(),
      phone: normalizedPhone,
    };

    this.authService
      .register(payload)
      .pipe(finalize(() => (this.status = 'init')))
      .subscribe({
        next: () => {
          // El SSO ya dispara el email de verificación al registrarse,
          // no hace falta llamar `sendVerifyEmail` manualmente.
          this.status = 'success';
          this.openSuccessModal(normalizedEmail);
          this.redirectTimeoutId = window.setTimeout(() => {
            this.goToLogin();
          }, 4000);
        },
        error: (err) => {
          this.status = 'failed';
          this.errorMsg = this.parseApiError(err);
        },
      });
  }

  openSuccessModal(email: string) {
    this.modalTitle = '¡Cuenta creada!';
    this.modalMsg =
      `Te enviamos un correo a ${email} para verificar tu cuenta. ` +
      `Revisa tu bandeja de entrada o la carpeta de spam.`;
    this.showSuccessModal = true;
  }

  closeSuccessModal() {
    this.showSuccessModal = false;
  }

  goToLogin() {
    if (this.redirectTimeoutId !== undefined) {
      window.clearTimeout(this.redirectTimeoutId);
      this.redirectTimeoutId = undefined;
    }
    this.closeSuccessModal();
    this.switchToLogin.emit();
  }

  resendVerification() {
    const email = this.form.controls.email.value?.trim().toLowerCase();
    if (!email) return;

    this.status = 'loading';
    this.authService
      .sendVerifyEmail(email)
      .pipe(finalize(() => (this.status = 'init')))
      .subscribe({
        next: () => {
          this.openSuccessModal(email);
        },
        error: (err) => {
          this.errorMsg = this.parseApiError(err);
        },
      });
  }
}
