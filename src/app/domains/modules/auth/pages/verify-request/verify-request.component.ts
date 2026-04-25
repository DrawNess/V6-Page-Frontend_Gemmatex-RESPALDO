import { Component, DestroyRef, inject, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs/operators';

import { AuthService } from '@shared/services/auth.service';

type Status = 'init' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-request',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './verify-request.component.html',
  styleUrl: './verify-request.component.css',
})
export class VerifyRequestComponent implements OnDestroy {
  private readonly destroyRef = inject(DestroyRef);

  status: Status = 'init';
  errorMsg = '';
  showModal = false;

  cooldownSeconds = 0;
  private cooldownTimer?: number;
  private modalTimeoutId?: number;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    // limpiar error al escribir
    this.form.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => (this.errorMsg = ''));

    // Prefill desde /auth/verify-request?email=...
    const qpEmail = (this.route.snapshot.queryParamMap.get('email') || '')
      .trim()
      .toLowerCase();

    if (qpEmail) {
      this.form.controls.email.setValue(qpEmail);
      this.loadCooldown(qpEmail);
    }
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer !== undefined) {
      window.clearInterval(this.cooldownTimer);
    }
    if (this.modalTimeoutId !== undefined) {
      window.clearTimeout(this.modalTimeoutId);
    }
  }

  get loading() {
    return this.status === 'loading';
  }

  get f() {
    return this.form.controls;
  }

  // ---- Cooldown helpers ----
  private cooldownKey(email: string) {
    return `gemmatex_verify_cooldown_until:${email}`;
  }

  private startCooldown(seconds: number) {
    this.cooldownSeconds = seconds;
    if (this.cooldownTimer !== undefined) {
      window.clearInterval(this.cooldownTimer);
    }

    this.cooldownTimer = window.setInterval(() => {
      this.cooldownSeconds = Math.max(0, this.cooldownSeconds - 1);
      if (this.cooldownSeconds === 0 && this.cooldownTimer !== undefined) {
        window.clearInterval(this.cooldownTimer);
      }
    }, 1000);
  }

  private loadCooldown(email: string) {
    const until = Number(sessionStorage.getItem(this.cooldownKey(email)) || '0');
    const diff = Math.ceil((until - Date.now()) / 1000);
    if (diff > 0) this.startCooldown(diff);
  }

  private setCooldown(email: string, seconds: number) {
    const until = Date.now() + seconds * 1000;
    sessionStorage.setItem(this.cooldownKey(email), String(until));
    this.startCooldown(seconds);
  }

  // ---- Main submit ----
  submit() {
    this.errorMsg = '';
    this.showModal = false;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.getRawValue().email.trim().toLowerCase();

    // Si está en cooldown: bloquear
    const until = Number(sessionStorage.getItem(this.cooldownKey(email)) || '0');
    if (until > Date.now()) {
      this.loadCooldown(email);
      this.errorMsg = `Espera ${this.cooldownSeconds}s para reenviar.`;
      return;
    }

    this.status = 'loading';

    this.authService
      .sendVerifyEmail(email)
      .pipe(
        finalize(() => {
          // no pisar success/error
          if (this.status === 'loading') this.status = 'init';
        })
      )
      .subscribe({
        next: () => {
          this.status = 'success';

          // ✅ cooldown 40s
          this.setCooldown(email, 40);

          // ✅ premium: abrir modal luego de 2s
          this.modalTimeoutId = window.setTimeout(() => {
            this.showModal = true;
          }, 2000);
        },
        error: (err) => {
          this.status = 'error';
          this.errorMsg =
            err?.error?.message ||
            err?.error?.errors?.message ||
            'No se pudo reenviar el correo. Verifica el email.';
        },
      });
  }

  closeModal() {
    this.showModal = false;
  }

  goLogin() {
    const email = this.form.getRawValue().email?.trim().toLowerCase() || '';
    this.router.navigate(['/auth/login'], { queryParams: { email } });
  }

}
