import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { finalize } from 'rxjs/operators';
import { AuthService } from '@shared/services/auth.service';

type Status = 'init' | 'loading' | 'success' | 'error';
@Component({
  selector: 'app-verify-mail',
  imports: [CommonModule, RouterLink],
  templateUrl: './verify-mail.component.html',
  styleUrl: './verify-mail.component.css',
})
export class VerifyMailComponent implements OnInit, OnDestroy {
  private redirectTimeoutId?: number;

  status: Status = 'init';
  msg = 'Validando verificación...';
  token = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.token) {
      this.status = 'error';
      this.msg = 'No se encontró el token de verificación.';
      return;
    }

    this.status = 'loading';

    this.authService.verifyEmail(this.token)
      .pipe(finalize(() => {}))
      .subscribe({
        next: (rta) => {
          this.status = 'success';
          this.msg = rta?.message || 'Correo verificado correctamente.';

          // Redirige a login en 9s
          this.redirectTimeoutId = window.setTimeout(() => this.router.navigate(['/auth/login']), 9000);
        },
        error: () => {
          this.status = 'error';
          this.msg = 'Token inválido o expirado. Puedes solicitar un nuevo correo de verificación.';
        }
      });
  }

  ngOnDestroy(): void {
    if (this.redirectTimeoutId !== undefined) {
      window.clearTimeout(this.redirectTimeoutId);
    }
  }

  goLogin() {
    this.router.navigate(['/auth/login']);
  }

  // opcional: si quieres reenvío desde aquí
  resend(email: string) {
    // aquí podrías pedir email en UI, o traerlo de un estado guardado
    // this.authService.sendVerifyEmail(email).subscribe(...)
  }
}
