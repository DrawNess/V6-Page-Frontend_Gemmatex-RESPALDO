import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { Title, Meta } from '@angular/platform-browser';

import { AuthService } from '@shared/services/auth.service';

type RequestStatus = 'init' | 'loading' | 'success' | 'failed';

@Component({
  selector: 'app-login',
  imports: [ CommonModule, ReactiveFormsModule, RouterLink ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent {

  status: RequestStatus = 'init';
  errorMsg = '';
  errorCode: 'EMAIL_NOT_VERIFIED' | null = null;
  infoMsg = '';
  resendLoading = false;

  showPassword = false;
  capsLockOn = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    remember: [true],
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService,
    private title: Title,
    private meta: Meta
  ) {
    // SEO básico
    this.title.setTitle('Iniciar sesión | Gemmatex');
    this.meta.updateTag({
      name: 'description',
      content: 'Inicia sesión en Gemmatex para gestionar pedidos, historial y soporte postventa.',
    });
    this.meta.updateTag({ name: 'robots', content: 'index,follow' });
  }

  get loading() {
    return this.status === 'loading';
  }

  get emailCtrl() {
    return this.form.controls.email;
  }
  get passCtrl() {
    return this.form.controls.password;
  }

  onPasswordKey(e: KeyboardEvent) {
    this.capsLockOn = e.getModifierState?.('CapsLock') ?? false;
  }

  doLogin() {
    this.errorMsg = '';
    this.infoMsg = '';
    this.errorCode = null;


    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.status = 'loading';

    const { email, password } = this.form.getRawValue();

    this.authService
      .login(email.trim().toLowerCase(), password)
      .pipe(finalize(() => (this.status = 'init')))
      .subscribe({
        next: () => {
          this.status = 'success';
          this.router.navigate(['/']); // cambia si tu home es otra ruta
        },
        error: (err) => {
          this.status = 'failed';
          /* this.errorMsg = err?.error?.message || 'Credenciales inválidas.'; */

          const msg = err?.error?.message || err?.error?.errors?.message;

          if (msg === 'EMAIL_NOT_VERIFIED') {
            this.errorCode = 'EMAIL_NOT_VERIFIED';
            this.errorMsg = '';
            return;
          }
          this.errorMsg = 'Credenciales inválidas o error de servidor.';
        },
      });
  }

  resendVerification() {
    this.infoMsg = '';
    this.resendLoading = true;

    const email = (this.form.controls.email.value || '').trim().toLowerCase();
    if (!email) {
      this.resendLoading = false;
      this.infoMsg = 'Ingresa tu correo arriba para reenviar.';
      return;
    }

    this.authService.sendVerifyEmail(email).subscribe({
      next: () => {
        this.infoMsg = 'Listo. Si el correo existe, te llegará un enlace en unos segundos.';
        this.resendLoading = false;
      },
      error: () => {
        // aunque falle, por seguridad mostramos genérico
        this.infoMsg = 'Listo. Si el correo existe, te llegará un enlace en unos segundos.';
        this.resendLoading = false;
      }
    });
  }

  focusEmail() {
    const el = document.querySelector<HTMLInputElement>('input[formControlName="email"]');
    el?.focus();
    el?.select();
  }
}
