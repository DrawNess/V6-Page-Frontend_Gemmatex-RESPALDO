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
import { finalize } from 'rxjs/operators';

import { AuthService } from '@shared/services/auth.service';

type RequestStatus = 'init' | 'loading' | 'success' | 'failed';

// validador: password === confirmPassword
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
  showPassword = false;
  capsLockOn = false;

  // ✅ clave: solo mostrar errores globales al apretar Registrar
  submitted = false;

  // dinámico
  pwdScore = 0; // 0..4
  pwdLabel = 'Débil';

  form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.minLength(2)]],
      lastName: ['', [Validators.required, Validators.minLength(2)]],

      // Bolivia suele ser 8 dígitos: ajusta si quieres
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
    // Fuerza en vivo
    this.form.controls.password.valueChanges.subscribe((pwd) => {
      const s = this.calcPasswordScore(pwd || '');
      this.pwdScore = s;
      this.pwdLabel = s <= 1 ? 'Débil' : s === 2 ? 'Media' : s === 3 ? 'Buena' : 'Fuerte';
    });

    // Si el usuario vuelve a editar, limpiamos error del backend
    this.form.valueChanges.subscribe(() => {
      this.errorMsg = '';
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

  // reglas visuales (puedes ajustarlas)
  hasMinLen(p: string) { return (p ?? '').length >= 8; }
  hasUpper(p: string) { return /[A-Z]/.test(p ?? ''); }
  hasNumber(p: string) { return /\d/.test(p ?? ''); }
  hasSymbol(p: string) { return /[^A-Za-z0-9\s]/.test(p ?? ''); }
  noSpaces(p: string) { return !/\s/.test(p ?? ''); }

  calcPasswordScore(p: string) {
    let s = 0;
    if (this.hasMinLen(p)) s++;
    if (this.hasUpper(p)) s++;
    if (this.hasNumber(p)) s++;
    if (this.hasSymbol(p)) s++;
    return s;
  }

  // ✅ error global SOLO cuando submitted = true
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
    const msg = err?.error?.errors?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;

    const arr = err?.error?.errors?.message || err?.error?.errors || err?.error?.details;
    if (Array.isArray(arr) && arr.length) {
      return arr
        .map((e: any) => (typeof e === 'string' ? e : e?.message))
        .filter(Boolean)
        .join(' | ');
    }

    return 'No se pudo registrar. Verifica los datos.';
  }

  register() {
    this.submitted = true; // ✅ ahora sí mostramos errores globales
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status = 'loading';

    const { name, lastName, phone, email, password } = this.form.getRawValue();

    // payload igual a Postman
    const payload = {
      name: name.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      user: {
        email: email.trim().toLowerCase(),
        password,
      },
    };

    this.authService
      .register(payload as any)
      .pipe(finalize(() => (this.status = 'init')))
      .subscribe({
        next: () => {
          this.status = 'success';
          this.router.navigate(['/auth/verify-email']);
        },
        error: (err) => {
          this.status = 'failed';
          this.errorMsg = this.parseApiError(err); // ✅ mensaje real backend
        },
      });
  }
}
