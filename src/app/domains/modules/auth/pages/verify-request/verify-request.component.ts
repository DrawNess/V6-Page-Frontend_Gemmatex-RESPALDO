import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
  });

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    this.form.valueChanges.subscribe(() => (this.errorMsg = ''));
  }

  get loading() {
    return this.status === 'loading';
  }

  get f() {
    return this.form.controls;
  }

  submit() {
    this.errorMsg = '';
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status = 'loading';
    const email = this.form.getRawValue().email.trim().toLowerCase();

    this.authService
      .sendVerifyEmail(email)
      .pipe(finalize(() => (this.status = 'init')))
      .subscribe({
        next: () => {
          // premium: abre modal + deja 2s
          this.showModal = true;
          this.status = 'success';

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

  closeModal() {
    this.showModal = false;
  }

  goLogin() {
    this.router.navigate(['/auth/login']);
  }

}
