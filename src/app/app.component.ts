import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { catchError, of } from 'rxjs';

import { AuthService } from '@services/auth.service';
import { TokenService } from '@services/token.service';
import { SessionService } from '@services/session.service';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet],
  template: '<router-outlet />',
})
export class AppComponent implements OnInit {
  title = 'Gemmatex';

  private readonly tokenService = inject(TokenService);
  private readonly authService = inject(AuthService);
  private readonly sessionService = inject(SessionService);

  ngOnInit(): void {
    // Silent refresh al arrancar — sólo cuando hay rastros de una sesión
    // previa en localStorage. Sin eso, llamar `/auth/refresh` sin cookie
    // ensucia logs con 400. Si la cookie httpOnly del SSO sigue viva,
    // recuperamos un access token nuevo; si no, seguimos anónimos y el
    // guard envía al login.
    const hadSession = !!this.sessionService.getCurrentUserIdFromSession();
    if (!hadSession) return;

    const token = this.tokenService.getToken();
    const needsRefresh = !token || this.tokenService.isTokenExpired();
    if (!needsRefresh) return;

    this.authService
      .refresh()
      .pipe(catchError(() => of(null)))
      .subscribe();
  }
}
