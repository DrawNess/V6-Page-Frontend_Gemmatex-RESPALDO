import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '@shared/services/auth.service';

type Status = 'init' | 'loading' | 'success' | 'error';

@Component({
  selector: 'app-verify-request',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './verify-request.component.html',
  styleUrl: './verify-request.component.css',
})
export class VerifyRequestComponent {
  status: Status = 'init';
  errorMsg = '';
  showModal = false;

  sentOnce = false;

  private sentKey(email: string) {
    return `gemmatex-verify-email-sent-${email}`;
  }

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.form.valueChanges.subscribe(() => (this.errorMsg = ''));

    // Prefill desde /auth/verify-request?email=...
    const qpEmail = (this.route.snapshot.queryParamMap.get('email') || '')
      .trim()
      .toLowerCase();

    if (qpEmail) {
      this.form.controls.email.setValue(qpEmail);
      this.sentOnce = sessionStorage.getItem(this.sentKey(qpEmail)) === '1';
    }
  }

  get loading() {
    return this.status === 'loading';
  }

  get f() {
    return this.form.controls;
  }

  submit() {
    this.errorMsg = '';
    this.showModal = false;

    const email = this.form.getRawValue().email.trim().toLowerCase();

        // ✅ si ya se envió una vez, no permitir otra
    if (email && sessionStorage.getItem(this.sentKey(email)) === '1') {
      this.sentOnce = true;
      this.status = 'success';
      this.errorMsg = '';
      // modal premium opcional (si quieres)
      this.showModalAfterDelay();
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status = 'loading';
    /* const email = this.form.getRawValue().email.trim().toLowerCase(); */

    this.authService
      .sendVerifyEmail(email)
      .pipe(finalize(() => (this.status = 'init')))
      .subscribe({
        next: () => {
          // premium: abre modal + deja 2s
          this.showModal = true;
          this.status = 'success';

          //Marcado como 1 vez enviado
          sessionStorage.setItem(this.sentKey(email), '1');

          this.showModalAfterDelay();

          setTimeout(() => {
            // opcional: mandarlo al login luego de 2s
            // this.router.navigate(['/auth/login']);
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

  private showModalAfterDelay() {
    setTimeout(() => {
      this.showModal = true;
    }, 2000);
  }

  closeModal() {
    this.showModal = false;
  }

  goLogin() {
    /* this.router.navigate(['/auth/login']); */
        const email = this.form.getRawValue().email?.trim().toLowerCase() || '';
    // opcional: pasar el email al login
    this.router.navigate(['/auth/login'], { queryParams: { email } });
  }

}
