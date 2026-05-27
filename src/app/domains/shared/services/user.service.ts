import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, throwError } from 'rxjs';

import { environment } from '@environments/environment';
import { ApiRole, ApiUser, ApiUserRole } from '@shared/models/user-portal.model';
import { AuthUser } from '@shared/models/auth.model';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { ProfileService } from './profile.service';

/**
 * Servicio admin de usuarios. Tras la integración con SSO, todas las
 * operaciones CRUD apuntan a `/admin/users` del SSO. Los IDs son UUID v7
 * (string).
 *
 * Notas:
 *  - "Crear usuario" no existe como POST directo. El flujo del SSO es
 *    invitación → email → aceptación. `createUser` lanza un error
 *    explícito para que la UI redirija al endpoint correcto.
 *  - "Roles globales" en el SSO son un catálogo fijo (`client`, `staff`,
 *    `admin`, `super_admin`). No hay endpoint `/roles` — se devuelven
 *    hardcoded.
 *  - Roles fine-grained por sucursal (`seller`, `branch_admin`, …) viven
 *    en `user_branches` del API-V6, NO en el SSO. Para asignarlos usar
 *    `POST /api/v1/admin/user-branches` del API-V6.
 */

interface CreateUserPayload {
  email: string;
  password: string;
}

interface AssignRolePayload {
  roleId: number;
  branchId: number | null;
}

interface SsoUserResponse {
  user: AuthUser;
}

interface SsoUserListResponse {
  data?: AuthUser[];
  meta?: unknown;
}

const GLOBAL_ROLES_CATALOG: ApiRole[] = [
  { id: 'client', name: 'Cliente', slug: 'client', is_system: true },
  { id: 'staff', name: 'Staff (empleado)', slug: 'staff', is_system: true },
  { id: 'admin', name: 'Admin global', slug: 'admin', is_system: true },
  { id: 'super_admin', name: 'Super Admin', slug: 'super_admin', is_system: true },
];

@Injectable({
  providedIn: 'root',
})
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly tokenService = inject(TokenService);
  private readonly sessionService = inject(SessionService);
  private readonly profileService = inject(ProfileService);

  private readonly ssoUrl = environment.SSO_URL;
  private readonly clientId = environment.SSO_CLIENT_ID;

  private ssoHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Client-Id': this.clientId });
  }

  private ssoOptions() {
    return { headers: this.ssoHeaders(), withCredentials: true };
  }

  // ─── Admin CRUD ───────────────────────────────────────────

  getUsers(): Observable<ApiUser[]> {
    return this.http
      .get<SsoUserListResponse>(`${this.ssoUrl}/admin/users`, this.ssoOptions())
      .pipe(map((res) => (res.data ?? []) as ApiUser[]));
  }

  getUserById(userId: string | number): Observable<ApiUser> {
    const id = String(userId);
    return this.http
      .get<SsoUserResponse>(`${this.ssoUrl}/admin/users/${id}`, this.ssoOptions())
      .pipe(map((res) => res.user as ApiUser));
  }

  /**
   * No se permite crear usuarios directamente. Para crear staff/admin se
   * usa el flujo de invitaciones del SSO: `POST /admin/invitations`. Para
   * crear clientes finales lo hace el propio cliente vía `/auth/register`.
   */
  createUser(_payload: CreateUserPayload): Observable<ApiUser> {
    return throwError(() => ({
      status: 501,
      error: {
        message:
          'Crear usuarios directamente ya no está soportado. Usa el flujo de invitaciones: POST /admin/invitations',
      },
    }));
  }

  updateUser(
    userId: string | number,
    payload: Partial<Pick<ApiUser, 'email' | 'roles' | 'status'>>
  ): Observable<ApiUser> {
    const id = String(userId);
    return this.http
      .patch<SsoUserResponse>(
        `${this.ssoUrl}/admin/users/${id}`,
        payload,
        this.ssoOptions()
      )
      .pipe(map((res) => res.user as ApiUser));
  }

  deleteUser(userId: string | number): Observable<void> {
    const id = String(userId);
    return this.http.delete<void>(
      `${this.ssoUrl}/admin/users/${id}`,
      this.ssoOptions()
    );
  }

  // ─── Catálogo de roles (hardcoded) ────────────────────────

  getRoles(): Observable<ApiRole[]> {
    // El SSO no expone /roles. El catálogo es fijo a nivel sistema.
    return new Observable<ApiRole[]>((subscriber) => {
      subscriber.next(GLOBAL_ROLES_CATALOG);
      subscriber.complete();
    });
  }

  getUserRoles(userId: string | number): Observable<ApiUserRole[]> {
    // Los roles vienen ya en getUserById(). Devolvemos shape vacío
    // mientras los componentes admin se migran al patrón nuevo.
    return this.getUserById(userId).pipe(map(() => [] as ApiUserRole[]));
  }

  /**
   * @deprecated En el SSO no se asignan roles uno a uno; se patchea el array
   * completo via `updateUser(uuid, { roles: [...] })`. Para roles
   * fine-grained por sucursal usar `POST /api/v1/admin/user-branches` del
   * API-V6.
   */
  assignRole(
    _userId: string | number,
    _payload: AssignRolePayload
  ): Observable<ApiUserRole> {
    return throwError(() => ({
      status: 501,
      error: {
        message:
          'Usar updateUser(uuid, { roles: [...] }) para roles globales, o POST /admin/user-branches (API-V6) para roles por sucursal.',
      },
    }));
  }

  /** @deprecated Igual que assignRole. */
  revokeRole(
    _userId: string | number,
    _userRoleId: number
  ): Observable<{ id: number; message: string }> {
    return throwError(() => ({
      status: 501,
      error: {
        message:
          'Usar updateUser(uuid, { roles: [...] }) excluyendo el rol a remover, o DELETE /admin/user-branches/:id (API-V6).',
      },
    }));
  }

  // ─── Helpers del usuario actual ───────────────────────────

  /**
   * UUID v7 del usuario actual. Antes devolvía `number` (INT del API-V6 viejo);
   * tras la integración devuelve `string | null`. Componentes legacy que
   * comparan con `> 0` siguen funcionando porque un UUID válido es truthy.
   */
  getCurrentUserId(): string | null {
    return (
      this.tokenService.getUserIdFromToken() ??
      this.sessionService.getCurrentUserIdFromSession()
    );
  }

  /**
   * Devuelve el usuario actual. Usa `/auth/me` del SSO (self-service, no
   * requiere rol admin). Esto evita 403 en clientes que invoquen este
   * método para poblar el perfil.
   */
  getCurrentUser(): Observable<ApiUser> {
    return this.profileService.getMeDetails().pipe(
      map((details) => details.user as ApiUser)
    );
  }
}
