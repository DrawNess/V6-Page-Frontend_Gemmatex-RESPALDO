import { Component } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';

import { AuthService } from '@shared/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ ReactiveFormsModule, RouterLink ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {

  loading = false;
  showPassword = false;
  errorMsg = '';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: [true],
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {}

  get emailCtrl() { return this.form.controls.email; }
  get passCtrl() { return this.form.controls.password; }

  doLogin() {
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;
    const { email, password } = this.form.getRawValue();

    this.authService.login(email, password)
      .pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: (res) => {
          // Guarda token si aplica (opcional)
          // localStorage.setItem('token', res.token);

          this.router.navigate(['']);
        },
        error: (err) => {
          // Si tu API devuelve mensaje, úsalo:
          this.errorMsg = err?.error?.message || 'Credenciales inválidas o error de servidor.';
        }
      });
  }

}
