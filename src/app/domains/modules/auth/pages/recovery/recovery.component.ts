import { Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { AuthService } from '@shared/services/auth.service';
import { parseApiError } from '@core/utils/parse-api-error';

@Component({
  selector: 'app-recovery',
  imports: [ReactiveFormsModule, RouterModule],
  templateUrl: './recovery.component.html',
  styleUrl: './recovery.component.css',
})
export class RecoveryComponent implements OnInit, OnDestroy {
  private readonly destroyRef = inject(DestroyRef);
  private redirectTimeoutId?: number;

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
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const navEmail = this.router.getCurrentNavigation()?.extras?.state?.['email'] as string | undefined;
    const queryEmail = this.route.snapshot.queryParamMap.get('email') ?? navEmail;
    if (queryEmail) {
      this.form.patchValue({ email: queryEmail });
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

  private parseError(err: unknown): string {
    return parseApiError(err, {
      fallback: 'Ocurrió un error inesperado. Intenta nuevamente.',
      statusMessages: {
        401: 'Correo no encontrado o no autorizado.',
        400: 'Solicitud inválida. Revisa el correo.',
      },
    });
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

    this.authService.recoverPassword(email)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
      next: (rta) => {
        // tu API devuelve { message: 'Mail sent' }
        this.successMsg = rta?.message || 'Revisa tu correo para continuar.';
        this.loading = false;

        // Después de 1.5s lo mandas al login
        this.redirectTimeoutId = window.setTimeout(() => this.router.navigate(['/auth/login']), 1500);
      },
      error: (err) => {
        this.errorMsg = this.parseError(err);
        this.loading = false;
      },
    });
  }
}
