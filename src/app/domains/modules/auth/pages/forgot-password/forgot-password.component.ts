import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '@shared/services/auth.service';
import { parseApiError } from '@core/utils/parse-api-error';
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private redirectTimeoutId?: number;

  loading = false;
  submitted = false;

  token: string | null = null;

  errorMsg: string | null = null;
  successMsg: string | null = null;

  showPassword = false;
  showConfirm = false;
  capsLockOn = false;

  form = this.fb.nonNullable.group(
    {
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: [this.matchPasswordsValidator] }
  );

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private title: Title,
    private meta: Meta
  ) {
    // SEO básico
    this.title.setTitle('Restablecer contraseña | Gemmatex');
    this.meta.updateTag({
      name: 'description',
      content: 'Restablece tu contraseña de Gemmatex de forma segura usando un enlace temporal.',
    });
  }

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token');

    if (!this.token) {
      this.errorMsg = 'El enlace no es válido (falta el token). Solicita uno nuevo.';
    }
  }

  ngOnDestroy(): void {
    if (this.redirectTimeoutId !== undefined) {
      window.clearTimeout(this.redirectTimeoutId);
    }
  }

  get f() {
    return this.form.controls;
  }

  matchPasswordsValidator(group: AbstractControl): ValidationErrors | null {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  onPasswordKey(event: KeyboardEvent) {
    this.capsLockOn = event.getModifierState?.('CapsLock') ?? false;
  }

  private parseError(err: unknown): string {
    return parseApiError(err, {
      statusMessages: {
        401: 'El enlace expiró o no es válido. Solicita uno nuevo.',
        400: 'Solicitud inválida. Revisa los datos.',
      },
    });
  }

  submitNewPassword() {
    this.submitted = true;
    this.errorMsg = null;
    this.successMsg = null;

    if (!this.token) {
      this.errorMsg = 'El enlace no es válido. Solicita uno nuevo.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    const { password } = this.form.getRawValue();
    this.authService.changePassword(this.token, password)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (rta) => {
        this.successMsg = rta?.message || 'Contraseña actualizada correctamente.';
        this.loading = false;

        // Redirigir al login
        this.redirectTimeoutId = window.setTimeout(() => this.router.navigate(['/auth/login']), 1200);
      },
      error: (err) => {
        this.errorMsg = this.parseError(err);
        this.loading = false;
      },
    });
  }
}
