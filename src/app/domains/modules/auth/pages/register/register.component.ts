// register.component.ts
import { Component } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize, switchMap } from 'rxjs/operators';
import { timer } from 'rxjs';

import { AuthService } from '@shared/services/auth.service';

type RequestStatus = 'init' | 'loading' | 'success' | 'failed';

function matchPasswords(a: string, b: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const p1 = control.get(a)?.value;
    const p2 = control.get(b)?.value;
    return p1 === p2 ? null : { mismatch: true };
  };
}

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css',
})

export class RegisterComponent {
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
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required, Validators.minLength(8)]],
      terms: [false, [Validators.requiredTrue]],
    },
    { validators: [matchPasswords('password', 'confirmPassword')] }
  );

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    // Limpia error backend al editar
    this.form.valueChanges.subscribe(() => (this.errorMsg = ''));

    // Fuerza en vivo (opcional)
    this.form.controls.password.valueChanges.subscribe((pwd) => {
      const s = this.calcPasswordScore(pwd || '');
      this.pwdScore = s;
      this.pwdLabel = s <= 1 ? 'Débil' : s === 2 ? 'Media' : s === 3 ? 'Buena' : 'Fuerte';
    });
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
    if (this.f.password.invalid) return 'Revisa la contraseña.';
    if (this.f.name.invalid) return 'Revisa el nombre.';
    if (this.f.lastName.invalid) return 'Revisa el apellido.';
    if (this.f.phone.invalid) return 'Revisa el teléfono.';
    return null;
  }

  private parseApiError(err: any): string {
    // Sequelize unique constraint típico
    const msg = err?.error?.message || err?.error?.errors?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;

    const arr = err?.error?.errors?.message || err?.error?.errors || err?.error?.details;
    if (Array.isArray(arr) && arr.length) {
      return arr
        .map((e: any) => (typeof e === 'string' ? e : e?.message))
        .filter(Boolean)
        .join(' | ');
    }

    // fallback
    if (err?.status === 409) return 'Este correo ya está registrado.';
    return 'No se pudo registrar. Verifica los datos.';
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

    const payload = {
      name: name.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      user: {
        email: email.trim().toLowerCase(),
        password,
      },
    };

    // 1) POST /customers
    // 2) POST /auth/send-verify-email (con email devuelto por backend)
    // 3) Modal + esperar 2s + redirect
    this.authService
      .register(payload as any)
      .pipe(
        switchMap((res: any) => {
          const createdEmail = res?.newCustomer?.user?.email || payload.user.email;
          return this.authService.sendVerifyEmail(createdEmail);
        }),
        finalize(() => (this.status = 'init'))
      )
      .subscribe({
        next: () => {
          this.status = 'success';
          this.openSuccessModal(payload.user.email);
          timer(4000).subscribe(() => {
            this.goToLogin();
          });
          /* timer(2000).subscribe(() => {
            this.router.navigate(['/email-verified']); // o '/verify-success'
          }); */
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
    this.router.navigate(['/auth/login']);
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
