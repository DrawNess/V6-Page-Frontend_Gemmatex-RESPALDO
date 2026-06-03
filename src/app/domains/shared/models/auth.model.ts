/**
 * Modelos del flujo de autenticación contra el SSO GEMMATEX.
 *
 * El SSO emite JWT RS256 con `sub` = UUID v7. Para apps `spa-web` el refresh
 * token viaja en cookie `httpOnly`; el access token llega en la respuesta JSON.
 */

export interface ClientProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  phone_verified_at?: string | null;
  document_type?: 'CI' | 'NIT' | null;
  document_number?: string | null;
  birth_date?: string | null;
  razon_social?: string | null;
  departamento?: string | null;
  provincia?: string | null;
  ciudad?: string | null;
  calle_avenida?: string | null;
  numero?: string | null;
  casa_dpto?: string | null;
  link_google_maps?: string | null;
  country?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AdminProfile {
  user_id: string;
  first_name: string;
  last_name: string;
  job_title?: string | null;
  department?: string | null;
  employee_code?: string | null;
  phone?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUser {
  id: string;
  email: string;
  status?: 'pending' | 'active' | 'suspended' | 'deleted';
  email_verified_at?: string | null;
  last_login_at?: string | null;
  totp_enabled?: boolean;
  created_at?: string;
  updated_at?: string;
  roles?: string[];
  clientProfile?: ClientProfile | null;
  adminProfile?: AdminProfile | null;
  /** @deprecated SSO no emite `role` singular; usar `roles[]`. Mantenido para compat de UI antigua. */
  role?: string;
  /** @deprecated Branches viven en API-V6 (`user_branches`), no en el JWT. */
  branches?: number[];
  [key: string]: unknown;
}

export interface SsoLoginResponse {
  user: AuthUser;
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token_expires_at?: string;
  /** `'cookie'` si el refresh viajó en cookie httpOnly. */
  refresh_in?: 'cookie' | 'body';
  refresh_token?: string;
}

/**
 * Payload aceptado por `POST /auth/register` del SSO.
 * `email`, `password`, `first_name`, `last_name`, `phone` son obligatorios.
 * Dirección y documento son opcionales (paso completable después en perfil).
 */
export interface SsoRegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone: string;
  document_type?: 'CI' | 'NIT';
  document_number?: string;
  razon_social?: string;
  birth_date?: string;
  departamento?: string;
  provincia?: string;
  ciudad?: string;
  calle_avenida?: string;
  numero?: string;
  casa_dpto?: string;
  link_google_maps?: string;
}

/** @deprecated Usar `SsoLoginResponse`. */
export interface ResponseLogin {
  token?: string;
  user?: AuthUser;
  access_token?: string;
  refresh_token?: string;
}

/** @deprecated Reemplazado por `SsoRegisterPayload` plano. */
export interface RegisterCustomerDTO {
  name: string;
  lastName: string;
  phone: string;
  user: {
    email: string;
    password: string;
  };
}

/** @deprecated Usar `SsoLoginResponse`. */
export interface LoginResponse {
  token: string;
  user: AuthUser;
}

export interface SsoSession {
  id: string;
  user_id: string;
  application_id: string;
  family_id: string;
  expires_at: string;
  revoked_at: string | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
  is_current: boolean;
  application?: {
    id: string;
    name: string;
    display_name: string;
    type: string;
  };
}

export interface SsoSessionsResponse {
  items: SsoSession[];
  total: number;
}
