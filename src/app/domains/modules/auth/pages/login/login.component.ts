import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs/operators';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

import { AuthService } from '@shared/services/auth.service';
import { TokenService } from '@services/token.service';

type RequestStatus = 'init' | 'loading' | 'success' | 'failed';

@Component({
  selector: 'app-login',
  imports: [ CommonModule, ReactiveFormsModule, RouterLink ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css',
})
export class LoginComponent implements OnInit {

  @Output() switchToRegister = new EventEmitter<void>();

  status: RequestStatus = 'init';
  errorMsg = '';
  errorCode: 'EMAIL_NOT_VERIFIED' | null = null;

  showPassword = false;
  capsLockOn = false;

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private tokenService: TokenService
  ) {}

  ngOnInit(): void {
    const email = this.route.snapshot.queryParamMap.get('email')?.trim().toLowerCase();
    if (email) {
      this.form.controls.email.setValue(email);
    }
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
          const PANEL_ROLES = ['admin', 'branch_admin', 'seller', 'staff'];
          const roles = this.tokenService.getRolesFromToken().map(r => r.toLowerCase());
          const isPanelUser = roles.some(r => PANEL_ROLES.includes(r));

          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
          if (returnUrl && !isPanelUser) {
            this.router.navigateByUrl(returnUrl);
            return;
          }

          if (isPanelUser) {
            void this.router.navigateByUrl(`/${ROUTE_CONSTANTS.SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.MENU}`);
            return;
          }

          void this.router.navigateByUrl(`/${ROUTE_CONSTANTS.USER.BASE}`);
        },
        error: (err) => {
          this.status = 'failed';
          /* this.errorMsg = err?.error?.message || 'Credenciales inválidas.'; */

          const msg = err?.error?.message || err?.error?.errors?.message;

          if (msg === 'EMAIL_NOT_VERIFIED' || msg === 'EMAIL_NO_VERIFICADO') {
            this.errorCode = 'EMAIL_NOT_VERIFIED';
            this.errorMsg = '';
            return;
          }
          this.errorMsg = 'Credenciales inválidas o error de servidor.';
        },
      });
  }

  focusEmail() {
    const el = document.querySelector<HTMLInputElement>('input[formControlName="email"]');
    el?.focus();
    el?.select();
  }
}
