import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { environment } from '@environments/environment';
import { AuthUser, ClientProfile } from '@shared/models/auth.model';
import { ApiCustomer, ApiOrder } from '@shared/models/user-portal.model';
import { normalizeOrder } from '@shared/utils/order-normalizer';

/**
 * Servicios de perfil del cliente final.
 *
 *  - Datos personales y dirección viven en el SSO (`/auth/me`).
 *  - Las órdenes viven en API-V6 (`/profile/my-orders` y `/orders/:id`).
 *
 * Tras la integración, `userId` es UUID v7 (string). `customerId` queda
 * deprecated y devuelve `null`. Mantenemos `getMeDetails()` con una capa
 * de mapeo que expone `{ user, customer }` para componentes legacy
 * (checkout, perfil) que aún consumen los nombres viejos.
 */

export interface ProfileMeResponse {
  /** UUID v7 del usuario en el SSO. */
  userId: string;
  /** @deprecated Tras la integración con SSO no existe `customerId`. Devuelve `null`. */
  customerId: number | null;
}

export interface ProfileMeDetailsResponse {
  user: AuthUser;
  /**
   * Capa de compatibilidad: mapea `clientProfile` del SSO al shape antiguo
   * de `ApiCustomer` que usan los componentes legacy (checkout, account).
   */
  customer: ApiCustomer | null;
}

export interface ProfileMeUpdatePayload {
  email?: string;
  name?: string;
  lastName?: string;
  phone?: string;
  /** Campos extra para edición completa del perfil cliente. */
  document_type?: 'CI' | 'NIT' | null;
  document_number?: string | null;
  razon_social?: string | null;
  birth_date?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  ciudad?: string | null;
  calle_avenida?: string | null;
  numero?: string | null;
  casa_dpto?: string | null;
  link_google_maps?: string | null;
}

interface SsoMeResponse {
  user: AuthUser & { clientProfile?: ClientProfile | null };
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly http = inject(HttpClient);

  private readonly apiUrl = environment.API_URL;
  private readonly ssoUrl = environment.SSO_URL;
  private readonly clientId = environment.SSO_CLIENT_ID;

  private ssoHeaders(): HttpHeaders {
    return new HttpHeaders({ 'X-Client-Id': this.clientId });
  }

  private ssoOptions() {
    return { headers: this.ssoHeaders(), withCredentials: true };
  }

  /**
   * Devuelve los IDs básicos del usuario logueado (UUID + customerId stub).
   * Mantiene la firma vieja por compatibilidad con `customer.service.ts` y
   * `user.service.ts` que aún la invocan.
   */
  getMe(): Observable<ProfileMeResponse> {
    return this.http
      .get<SsoMeResponse>(`${this.ssoUrl}/auth/me`, this.ssoOptions())
      .pipe(
        map((res) => ({
          userId: res.user?.id,
          customerId: null,
        }))
      );
  }

  /**
   * Perfil completo del cliente con `user` + `customer` (alias de `clientProfile`).
   * El campo `customer` se sintetiza para compatibilidad con componentes legacy.
   */
  getMeDetails(): Observable<ProfileMeDetailsResponse> {
    return this.http
      .get<SsoMeResponse>(`${this.ssoUrl}/auth/me`, this.ssoOptions())
      .pipe(
        map((res) => ({
          user: res.user,
          customer: this.toLegacyCustomer(res.user),
        }))
      );
  }

  /**
   * Edita el perfil del cliente.
   *
   * El SSO usa snake_case en `client_profiles` (`first_name`, `last_name`,
   * `calle_avenida`, etc.). El payload acepta tanto los nombres viejos
   * (`name`, `lastName`) como los nuevos (`first_name`, `last_name`).
   *
   * NOTA: el SSO responde `{ user, profile, profile_type }` en PATCH (a
   * diferencia del GET que devuelve `{ user: { ..., clientProfile } }`).
   * Acá re-pegamos `profile` como `clientProfile` o `adminProfile` para
   * que el mapeo legacy siga funcionando uniformemente.
   */
  updateMe(payload: ProfileMeUpdatePayload): Observable<ProfileMeDetailsResponse> {
    const ssoPayload = this.toSsoUpdatePayload(payload);
    return this.http
      .patch<{
        user: AuthUser;
        profile?: ClientProfile | (AuthUser['adminProfile']);
        profile_type?: 'client' | 'admin';
      }>(`${this.ssoUrl}/auth/me`, ssoPayload, this.ssoOptions())
      .pipe(
        map((res) => {
          const user: AuthUser & { clientProfile?: ClientProfile | null } = { ...res.user };
          if (res.profile_type === 'client') {
            user.clientProfile = (res.profile ?? null) as ClientProfile | null;
          } else if (res.profile_type === 'admin') {
            user.adminProfile = (res.profile ?? null) as AuthUser['adminProfile'];
          }
          return {
            user,
            customer: this.toLegacyCustomer(user),
          };
        })
      );
  }

  // ─── Órdenes (viven en API-V6) ────────────────────────────

  getMyOrders(params?: {
    status?: string;
    page?: number;
    pageSize?: number;
  }): Observable<ApiOrder[]> {
    const query: Record<string, string> = {};
    if (params?.status) query['status'] = params.status;
    if (params?.page) query['page'] = String(params.page);
    if (params?.pageSize) query['pageSize'] = String(params.pageSize);

    return this.http
      .get<ApiOrder[] | { data?: ApiOrder[]; orders?: ApiOrder[] }>(
        `${this.apiUrl}/profile/my-orders`,
        { params: query }
      )
      .pipe(
        map((response) => {
          if (Array.isArray(response)) return response;
          return response.data ?? response.orders ?? [];
        }),
        map((list) => list.map((o) => normalizeOrder(o)))
      );
  }

  getMyOrderById(orderId: number): Observable<ApiOrder> {
    return this.http
      .get<ApiOrder | { data?: ApiOrder; order?: ApiOrder }>(
        `${this.apiUrl}/orders/${orderId}`
      )
      .pipe(
        map((response) => {
          if ('id' in (response as ApiOrder)) return response as ApiOrder;
          return (
            (response as { data?: ApiOrder; order?: ApiOrder }).data ??
            (response as { data?: ApiOrder; order?: ApiOrder }).order ??
            ({} as ApiOrder)
          );
        }),
        map((o) => normalizeOrder(o))
      );
  }

  // ─── Mapeos internos ──────────────────────────────────────

  private toLegacyCustomer(
    user: (AuthUser & { clientProfile?: ClientProfile | null }) | undefined
  ): ApiCustomer | null {
    const profile = user?.clientProfile;
    if (!user || !profile) return null;
    return {
      id: 0, // deprecated
      name: profile.first_name ?? '',
      lastName: profile.last_name ?? '',
      phone: profile.phone ?? '',
      company: profile.razon_social ?? null,
      region: profile.departamento ?? null,
      city: profile.ciudad ?? null,
      street: profile.calle_avenida ?? null,
      streetNumber: profile.numero ?? null,
      apartment: profile.casa_dpto ?? null,
      email: user.email,
      userId: (user.id as unknown) as number, // tipo compat — string UUID
    } as ApiCustomer;
  }

  private toSsoUpdatePayload(payload: ProfileMeUpdatePayload): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    if (payload.name !== undefined) out['first_name'] = payload.name;
    if (payload.lastName !== undefined) out['last_name'] = payload.lastName;
    if (payload.phone !== undefined) out['phone'] = payload.phone;
    if (payload.email !== undefined) out['email'] = payload.email;
    // Campos snake_case ya en formato SSO
    const passthrough: (keyof ProfileMeUpdatePayload)[] = [
      'document_type',
      'document_number',
      'razon_social',
      'birth_date',
      'departamento',
      'provincia',
      'ciudad',
      'calle_avenida',
      'numero',
      'casa_dpto',
      'link_google_maps',
    ];
    for (const key of passthrough) {
      if (payload[key] !== undefined) out[key] = payload[key];
    }
    return out;
  }
}
