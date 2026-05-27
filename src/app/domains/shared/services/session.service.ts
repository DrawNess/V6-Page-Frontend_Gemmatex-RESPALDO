import { Injectable, signal } from '@angular/core';
import { AuthUser } from '@shared/models/auth.model';

/**
 * Datos NO sensibles de la sesión actual.
 *
 * El JWT vive en memoria/sessionStorage (ver `TokenService`). Acá guardamos
 * únicamente el `userId` (UUID v7 del SSO), email y roles para evitar
 * tener que decodificar el JWT en cada vista.
 */
interface SessionState {
  userId?: string;
  email?: string;
  roles?: string[];
}

const SESSION_KEY = 'app_session_state_v2';
/** @deprecated Limpieza de claves del esquema viejo (INT IDs + customerId). */
const LEGACY_KEYS = ['app_session_state_v1', 'app_customer_map_v1'];

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  /** Signal con el estado mínimo de la sesión activa. */
  readonly session = signal<SessionState>({});

  constructor() {
    this.session.set(this.readSession());
    this.cleanupLegacyKeys();
  }

  private readSession(): SessionState {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? (JSON.parse(raw) as SessionState) : {};
    } catch {
      return {};
    }
  }

  private writeSession(next: SessionState): void {
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    } catch {
      /* SSR safe */
    }
    this.session.set(next);
  }

  private cleanupLegacyKeys(): void {
    try {
      for (const key of LEGACY_KEYS) localStorage.removeItem(key);
    } catch {
      /* noop */
    }
  }

  /**
   * Guarda info básica del usuario tras login.
   * Tras la integración con SSO, `user.id` es UUID v7 (string).
   */
  saveLogin(user: AuthUser | undefined): void {
    if (!user) {
      this.clearSession();
      return;
    }

    const roles: string[] | undefined = Array.isArray(user.roles)
      ? user.roles
      : typeof user.role === 'string'
      ? [user.role]
      : undefined;

    this.writeSession({
      userId: typeof user.id === 'string' ? user.id : undefined,
      email: typeof user.email === 'string' ? user.email : undefined,
      roles,
    });
  }

  getCurrentUserIdFromSession(): string | null {
    const userId = this.readSession().userId;
    return typeof userId === 'string' ? userId : null;
  }

  getRolesFromSession(): string[] {
    const roles = this.readSession().roles;
    return Array.isArray(roles) ? roles : [];
  }

  getEmailFromSession(): string | null {
    return this.readSession().email ?? null;
  }

  clearSession(): void {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* noop */
    }
    this.session.set({});
  }

  // ─── Compat layer (deprecated) ────────────────────────────
  // Tras la integración el concepto `customerId` desaparece (no hay tabla
  // `customers` local). Estos métodos se conservan stub para no romper
  // componentes legacy que aún los invocan. Devuelven `null` siempre.

  /** @deprecated `customerId` ya no existe (el cliente vive en el SSO via UUID). */
  saveIdentity(_userId: string | number, _customerId: number): void {
    /* noop — compat con código legacy */
  }

  /** @deprecated `customerId` ya no existe. Devuelve siempre `null`. */
  rememberCustomerForUser(_userId: string | number, _customerId: number): void {
    /* noop */
  }

  /** @deprecated `customerId` ya no existe. Devuelve siempre `null`. */
  getCustomerIdForUser(_userId: string | number): number | null {
    return null;
  }

  /** @deprecated `customerId` ya no existe. Devuelve siempre `null`. */
  getCurrentCustomerIdFromSession(): number | null {
    return null;
  }
}
