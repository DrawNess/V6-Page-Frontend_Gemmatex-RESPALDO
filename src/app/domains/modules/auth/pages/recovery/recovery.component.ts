import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '@shared/services/auth.service';

@Component({
  selector: 'app-recovery',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './recovery.component.html',
  styleUrl: './recovery.component.css',
})
export class RecoveryComponent {
  loading = false;
  submitted = false;

  // mensajes
  errorMsg: string | null = null;
  successMsg: string | null = null;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  get f() {
    return this.form.controls;
  }

  private parseError(err: unknown): string {
    // Boom + middleware de errores suele devolver:
    // { statusCode, error, message } o { message: '...' } o array
    if (err instanceof HttpErrorResponse) {
      const data: any = err.error;

      if (typeof data === 'string') return data;

      if (data?.message) {
        // message puede ser string o array
        if (Array.isArray(data.message)) return data.message.join(', ');
        return data.message;
      }

      if (data?.error) return data.error;

      if (err.status === 0) return 'No se pudo conectar con el servidor.';
      if (err.status === 401) return 'Correo no encontrado o no autorizado.';
      if (err.status === 400) return 'Solicitud inválida. Revisa el correo.';
      return `Error (${err.status}). Intenta nuevamente.`;
    }
    return 'Ocurrió un error inesperado. Intenta nuevamente.';
  }

  sendRecovery() {
    this.submitted = true;
    this.errorMsg = null;
    this.successMsg = null;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email } = this.form.getRawValue();

    this.authService.recoverPassword(email).subscribe({
      next: (rta) => {
        // tu API devuelve { message: 'Mail sent' }
        this.successMsg = rta?.message || 'Revisa tu correo para continuar.';
        this.loading = false;

        // Opcional: después de 1.5s lo mandas al login
        // setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      },
      error: (err) => {
        this.errorMsg = this.parseError(err);
        this.loading = false;
      },
    });
  }
}
