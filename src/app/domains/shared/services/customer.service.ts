import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, of, switchMap } from 'rxjs';

import { environment } from '@environments/environment';
import { ApiCustomer } from '@shared/models/user-portal.model';
import { AuthUser, ClientProfile } from '@shared/models/auth.model';
import { ProfileService } from './profile.service';

/**
 * Servicio "Customer" tras la integración con SSO.
 *
 * La tabla `customers` del API-V6 ya no existe. Lo que antes consultábamos
 * como `customer` ahora vive como `client_profile` en el SSO. Este servicio
 * conserva la API pública vieja (`getMyCustomer`, `updateMyCustomer`, etc.)
 * mapeando a/desde el shape de `clientProfile` para que los componentes
 * legacy de checkout/perfil sigan funcionando sin reescribirlos todos.
 *
 * Operaciones admin (`getCustomers`, `getCustomerById`, …) apuntan al
 * endpoint `/admin/users?role=client` del SSO.
 */

type CustomerUpdatePayload = Partial<
  Pick<
    ApiCustomer,
    | 'name'
    | 'lastName'
    | 'phone'
    | 'company'
    | 'region'
    | 'city'
    | 'street'
    | 'streetNumber'
    | 'apartment'
  >
>;

interface SsoUserResponse {
  user: AuthUser & { clientProfile?: ClientProfile | null };
}

interface SsoUserListResponse {
  data?: Array<AuthUser & { clientProfile?: ClientProfile | null }>;
  meta?: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly http = inject(HttpClient);
  private readonly profileService = inject(ProfileService);

  private readonly ssoUrl = environment.SSO_URL;
  private readonly clientId = environment.SSO_CLIENT_ID;

  private ssoHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Client-Id': this.clientId });
  }

  private ssoOptions() {
    return { headers: this.ssoHeaders(), withCredentials: true };
  }

  // ─── Self-service (cliente actual) ────────────────────────

  getMyCustomer(): Observable<ApiCustomer> {
    return this.profileService
      .getMeDetails()
      .pipe(map((details) => details.customer ?? ({} as ApiCustomer)));
  }

  updateMyCustomer(payload: CustomerUpdatePayload): Observable<ApiCustomer> {
    return this.profileService
      .updateMe({
        name: payload.name,
        lastName: payload.lastName,
        phone: payload.phone,
        // Map address legacy → snake_case SSO
        departamento: payload.region ?? undefined,
        ciudad: payload.city ?? undefined,
        calle_avenida: payload.street ?? undefined,
        numero: payload.streetNumber ?? undefined,
        casa_dpto: payload.apartment ?? undefined,
      })
      .pipe(map((details) => details.customer ?? ({} as ApiCustomer)));
  }

  getMyAddress(): Observable<CustomerUpdatePayload> {
    return this.getMyCustomer().pipe(
      map((c) => ({
        region: c.region ?? undefined,
        city: c.city ?? undefined,
        street: c.street ?? undefined,
        streetNumber: c.streetNumber ?? undefined,
        apartment: c.apartment ?? undefined,
      }))
    );
  }

  updateMyAddress(payload: CustomerUpdatePayload): Observable<CustomerUpdatePayload> {
    return this.updateMyCustomer(payload).pipe(
      map((c) => ({
        region: c.region ?? undefined,
        city: c.city ?? undefined,
        street: c.street ?? undefined,
        streetNumber: c.streetNumber ?? undefined,
        apartment: c.apartment ?? undefined,
      }))
    );
  }

  /**
   * Carga el cliente actual. Antes mapeaba userId → customerId vía cache.
   * Tras la integración, basta con `getMyCustomer()` (sólo cliente final).
   */
  getCurrentCustomer(): Observable<ApiCustomer> {
    return this.getMyCustomer();
  }

  // ─── Admin (panel) — consume SSO ──────────────────────────

  /**
   * Lista clientes (rol `client` en el SSO).
   * NOTA: estos endpoints requieren JWT con rol `admin` o `super_admin`.
   */
  getCustomers(): Observable<ApiCustomer[]> {
    return this.http
      .get<SsoUserListResponse>(
        `${this.ssoUrl}/admin/users?role=client`,
        this.ssoOptions()
      )
      .pipe(map((res) => (res.data ?? []).map((u) => this.userToCustomer(u))));
  }

  /**
   * Detalle de un cliente por UUID. El parámetro acepta string (UUID v7)
   * o number por compatibilidad con código que aún pasa el viejo `id`
   * numérico — se coerce a string.
   */
  getCustomerById(customerId: string | number): Observable<ApiCustomer> {
    const id = String(customerId);
    return this.http
      .get<SsoUserResponse>(`${this.ssoUrl}/admin/users/${id}`, this.ssoOptions())
      .pipe(map((res) => this.userToCustomer(res.user)));
  }

  updateCustomer(
    customerId: string | number,
    _payload: CustomerUpdatePayload
  ): Observable<ApiCustomer> {
    // El SSO no permite que un admin edite los datos personales del perfil
    // ajeno (el cliente debe modificar su propio perfil). Sólo se permiten
    // cambios de `status` y `roles` vía PATCH /admin/users/:id. Devuelve el
    // detalle actual para no romper UI; ver `endpoints-migration.md`.
    return this.getCustomerById(customerId);
  }

  deleteCustomer(customerId: string | number): Observable<void> {
    const id = String(customerId);
    return this.http.delete<void>(
      `${this.ssoUrl}/admin/users/${id}`,
      this.ssoOptions()
    );
  }

  // ─── Mapeos ───────────────────────────────────────────────

  private userToCustomer(
    user: (AuthUser & { clientProfile?: ClientProfile | null }) | undefined
  ): ApiCustomer {
    if (!user) return {} as ApiCustomer;
    const profile = user.clientProfile;
    return {
      id: 0, // deprecated — antes INT; ahora el UUID vive en `userId`
      name: profile?.first_name ?? '',
      lastName: profile?.last_name ?? '',
      phone: profile?.phone ?? '',
      company: profile?.razon_social ?? null,
      region: profile?.departamento ?? null,
      city: profile?.ciudad ?? null,
      street: profile?.calle_avenida ?? null,
      streetNumber: profile?.numero ?? null,
      apartment: profile?.casa_dpto ?? null,
      email: user.email,
      userId: user.id as unknown as number, // string UUID coerced for compat
    } as ApiCustomer;
  }
}
