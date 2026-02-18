import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Title, Meta } from '@angular/platform-browser';

import { AuthService } from '@shared/services/auth.service';
@Component({
  selector: 'app-forgot-password',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './forgot-password.component.html',
  styleUrl: './forgot-password.component.css',
})
export class ForgotPasswordComponent {
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

  get f() {
    return this.form.controls;
  }

  matchPasswordsValidator(group: any) {
    const pass = group.get('password')?.value;
    const confirm = group.get('confirmPassword')?.value;
    return pass === confirm ? null : { mismatch: true };
  }

  onPasswordKey(event: KeyboardEvent) {
    this.capsLockOn = event.getModifierState?.('CapsLock') ?? false;
  }

  private parseError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const data: any = err.error;

      if (typeof data === 'string') return data;

      if (data?.message) {
        if (Array.isArray(data.message)) return data.message.join(', ');
        return data.message;
      }

      // Tu AuthService lanza boom.unauthorized() si token expira o no coincide
      if (err.status === 401) return 'El enlace expiró o no es válido. Solicita uno nuevo.';
      if (err.status === 400) return 'Solicitud inválida. Revisa los datos.';
      if (err.status === 0) return 'No se pudo conectar con el servidor.';
      return `Error (${err.status}). Intenta nuevamente.`;
    }
    return 'Ocurrió un error inesperado.';
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
    this.authService.changePassword(this.token, password).subscribe({
      next: (rta) => {
        this.successMsg = rta?.message || 'Contraseña actualizada correctamente.';
        this.loading = false;

        // Redirigir al login
        setTimeout(() => this.router.navigate(['/auth/login']), 1200);
      },
      error: (err) => {
        this.errorMsg = this.parseError(err);
        this.loading = false;
      },
    });
  }
}
