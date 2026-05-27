import { Injectable, signal } from '@angular/core';

/**
 * Gestión del access token emitido por el SSO GEMMATEX.
 *
 * Estrategia tras la integración:
 *  - El access token (JWT RS256) llega en el body de `/auth/login` y
 *    `/auth/refresh`. Se guarda únicamente en memoria (signal) más un
 *    espejo en `sessionStorage` para sobrevivir un reload sin volver a loguear.
 *  - El refresh token vive en cookie `httpOnly + Secure + SameSite=Strict`
 *    emitida por el SSO (apps `spa-web`). El frontend nunca lo lee — sólo
 *    envía las requests con `withCredentials: true`.
 *  - `localStorage` queda fuera del flujo del JWT para mitigar XSS persistente.
 */

interface JwtPayload {
  sub?: string;
  aud?: string;
  iss?: string;
  email?: string;
  roles?: string[];
  app_id?: string;
  sid?: string;
  exp?: number;
  iat?: number;
  /** @deprecated SSO no emite `role` singular. */
  role?: string;
  /** @deprecated SSO no emite `branches[]`. */
  branches?: number[];
  [key: string]: unknown;
}

const STORAGE_KEY = 'sso_access_token_v1';

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  /** Signal con el access token actual; `null` si no hay sesión. */
  readonly token = signal<string | null>(null);

  constructor() {
    // Rehidrata el token del sessionStorage al arrancar (sobrevive a reload).
    if (typeof sessionStorage !== 'undefined') {
      const cached = sessionStorage.getItem(STORAGE_KEY);
      if (cached) this.token.set(cached);
    }
  }

  saveToken(token: string): void {
    this.token.set(token);
    try {
      sessionStorage.setItem(STORAGE_KEY, token);
    } catch {
      // sessionStorage puede no existir en SSR.
    }
  }

  getToken(): string | null {
    return this.token();
  }

  removeToken(): void {
    this.token.set(null);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  }

  private parsePayload(): JwtPayload | null {
    const token = this.getToken();
    if (!token) return null;

    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) return null;

      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded)) as JwtPayload;
    } catch {
      return null;
    }
  }

  getRolesFromToken(): string[] {
    const payload = this.parsePayload();
    if (Array.isArray(payload?.roles)) return payload!.roles as string[];
    if (typeof payload?.role === 'string') return [payload.role];
    return [];
  }

  hasRole(role: string): boolean {
    return this.getRolesFromToken()
      .map((r) => r.toLowerCase())
      .includes(role.toLowerCase());
  }

  /** @deprecated Las sucursales viven en API-V6 (`user_branches`), no en el JWT. */
  getBranchesFromToken(): number[] {
    const payload = this.parsePayload();
    return Array.isArray(payload?.branches) ? (payload!.branches as number[]) : [];
  }

  /** @deprecated SSO emite `roles[]`. Usar `getRolesFromToken()`. */
  getRoleFromToken(): string | null {
    const roles = this.getRolesFromToken();
    return roles[0] ?? null;
  }

  /**
   * Devuelve el `sub` del JWT — UUID v7 (string) emitido por el SSO.
   * Antes era INT en el API-V6 viejo; la firma del método se mantiene
   * pero ahora devuelve `string | null`.
   */
  getUserIdFromToken(): string | null {
    const payload = this.parsePayload();
    return typeof payload?.sub === 'string' ? payload.sub : null;
  }

  getEmailFromToken(): string | null {
    const payload = this.parsePayload();
    return typeof payload?.email === 'string' ? payload.email : null;
  }

  /** ID de la sesión activa (claim `sid` del SSO). Sirve para "esta sesión". */
  getSessionIdFromToken(): string | null {
    const payload = this.parsePayload();
    return typeof payload?.sid === 'string' ? payload.sid : null;
  }

  isTokenExpired(): boolean {
    const payload = this.parsePayload();
    if (!payload?.exp || typeof payload.exp !== 'number') return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) return false;
    return !this.isTokenExpired();
  }

  /**
   * `true` si tenemos un token y le quedan menos de `seconds` para expirar.
   * Útil para refresh proactivo antes de hacer requests pesadas.
   */
  expiresWithin(seconds: number): boolean {
    const payload = this.parsePayload();
    if (!payload?.exp) return true;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp - now < seconds;
  }
}
