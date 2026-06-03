import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, catchError, of, tap, throwError } from 'rxjs';

import { environment } from '@environments/environment';
import {
  AuthUser,
  SsoLoginResponse,
  SsoRegisterPayload,
  SsoSession,
  SsoSessionsResponse,
} from '@shared/models/auth.model';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { CartService } from './cart.service';
import { BranchCacheService } from './branch-cache.service';

/**
 * Cliente del SSO GEMMATEX para el flujo de identidad.
 *
 * Endpoints contra `SSO_URL` (puerto 2106 en dev). Todos enviados con
 * `withCredentials: true` para que la cookie `refresh_token` httpOnly
 * fluya entre frontend y SSO.
 */
@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly sessionService = inject(SessionService);
  private readonly cartService = inject(CartService);
  private readonly branchCache = inject(BranchCacheService);

  private readonly ssoUrl = environment.SSO_URL;
  private readonly clientId = environment.SSO_CLIENT_ID;

  /** Header común para llamadas al SSO. */
  private headers(): HttpHeaders {
    return new HttpHeaders({ 'X-Client-Id': this.clientId });
  }

  /** Petición autenticada por cookie httpOnly. */
  private cookieOptions() {
    return { headers: this.headers(), withCredentials: true };
  }

  // ─── Auth flow ────────────────────────────────────────────

  login(email: string, password: string): Observable<SsoLoginResponse> {
    return this.http
      .post<SsoLoginResponse>(
        `${this.ssoUrl}/auth/login`,
        { email, password },
        this.cookieOptions()
      )
      .pipe(
        tap((response) => this.persistSession(response)),
        catchError((err) => throwError(() => err))
      );
  }

  register(payload: SsoRegisterPayload): Observable<{ message: string; user: AuthUser }> {
    return this.http.post<{ message: string; user: AuthUser }>(
      `${this.ssoUrl}/auth/register`,
      payload,
      this.cookieOptions()
    );
  }

  /**
   * Cierra la sesión actual.
   *
   * Comportamiento:
   *  - Limpia el estado local INMEDIATAMENTE (token + session + branchCache + cart),
   *    así los callers (header, sidebar) que NO subscriben siguen viendo el
   *    cambio en UI sin necesidad de await.
   *  - Dispara `/auth/logout` al SSO en background (auto-subscrito) para que
   *    invalide la cookie httpOnly del refresh. Si falla, ya teardown corrió.
   */
  logout(allDevices = false): void {
    // 1) Capturamos el token y userId antes de limpiar — el token lo necesitamos
    //    como Authorization en la llamada al SSO; el userId para limpiar su clave
    //    de carrito en localStorage después del teardown.
    const token = this.tokenService.getToken();
    const userId = this.tokenService.getUserIdFromToken()
      ?? this.sessionService.getCurrentUserIdFromSession();

    // 2) Teardown SÍNCRONO. La UI debe reflejar "sin sesión" YA, sin esperar
    //    a que vuelva la respuesta del SSO. Así el `router.navigate` que
    //    típicamente sigue al `logout()` puede ir al `/auth/login` con el
    //    estado limpio y los guards no quedan en una sesión zombi.
    this.tokenService.removeToken();
    this.sessionService.clearSession();
    this.branchCache.clear();
    this.cartService.syncWithCurrentSession();
    if (userId) this.cartService.clearUserStorageKey(userId);

    // 3) Fire-and-forget al SSO con `x-skip-auth` para que el interceptor
    //    no intente adjuntar/refrescar nada — adjuntamos manualmente el
    //    token capturado (todavía válido). Si el SSO falla, no importa:
    //    el estado local ya está limpio.
    const headers = new HttpHeaders({
      'X-Client-Id': this.clientId,
      'x-skip-auth': '1',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });

    this.http
      .post<void>(
        `${this.ssoUrl}/auth/logout`,
        { all_devices: allDevices },
        { headers, withCredentials: true }
      )
      .pipe(catchError(() => of(void 0)))
      .subscribe();
  }

  /**
   * Solicita un nuevo access token usando la cookie `refresh_token` httpOnly.
   * Si la cookie es inválida/expiró el SSO responde 401 y limpiamos sesión.
   */
  refresh(): Observable<SsoLoginResponse> {
    return this.http
      .post<SsoLoginResponse>(
        `${this.ssoUrl}/auth/refresh`,
        {},
        this.cookieOptions()
      )
      .pipe(
        tap((response) => this.persistSession(response)),
        catchError((err) => {
          this.tokenService.removeToken();
          this.sessionService.clearSession();
          return throwError(() => err);
        })
      );
  }

  /** Intento silencioso de refresh al arrancar la app. Nunca lanza. */
  trySilentRefresh(): Observable<boolean> {
    return this.refresh().pipe(
      tap(() => true),
      catchError(() => of(false)),
      tap(() => true),
      // mapa a booleano simple
      catchError(() => of(false))
    ) as unknown as Observable<boolean>;
  }

  // ─── Email verification ───────────────────────────────────

  sendVerifyEmail(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.ssoUrl}/auth/resend-verification`,
      { email },
      this.cookieOptions()
    );
  }

  verifyEmail(token: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.ssoUrl}/auth/verify-email`,
      { token },
      this.cookieOptions()
    );
  }

  // ─── Password reset ───────────────────────────────────────

  recoverPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.ssoUrl}/auth/forgot-password`,
      { email },
      this.cookieOptions()
    );
  }

  /**
   * Reset usando el token recibido por email (link `?token=...`).
   */
  changePassword(token: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.ssoUrl}/auth/reset-password`,
      { token, new_password: newPassword },
      this.cookieOptions()
    );
  }

  /**
   * Cambio de password autenticado (usuario logueado).
   * El SSO aplica `password_history` (no reusar últimas N) y revoca refresh.
   */
  changePasswordAuthenticated(
    currentPassword: string,
    newPassword: string
  ): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.ssoUrl}/auth/change-password`,
      { current_password: currentPassword, new_password: newPassword },
      this.cookieOptions()
    );
  }

  // ─── Sessions ─────────────────────────────────────────────

  getSessions(): Observable<SsoSessionsResponse> {
    return this.http.get<SsoSessionsResponse>(
      `${this.ssoUrl}/auth/sessions`,
      this.cookieOptions()
    );
  }

  revokeSession(sessionId: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.ssoUrl}/auth/sessions/${sessionId}`,
      this.cookieOptions()
    );
  }

  logoutOtherSessions(): Observable<{ message: string; revoked: number }> {
    return this.http.post<{ message: string; revoked: number }>(
      `${this.ssoUrl}/auth/sessions/logout-others`,
      {},
      this.cookieOptions()
    );
  }

  // ─── Helpers internos ─────────────────────────────────────

  private persistSession(response: SsoLoginResponse): void {
    const token = response.access_token;
    if (token) this.tokenService.saveToken(token);
    if (response.user) this.sessionService.saveLogin(response.user);
    this.cartService.syncWithCurrentSession();
    this.branchCache.load();
  }
}
