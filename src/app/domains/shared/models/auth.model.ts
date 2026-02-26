export interface AuthUser {
  id?: number | string;
  email?: string;
  role?: string;
  [key: string]: unknown;
}

export interface ResponseLogin {
  token?: string;
  user?: AuthUser;
  access_token?: string;
  refresh_token?: string;
}

export interface RegisterCustomerDTO {
  name: string;
  lastName: string;
  phone: string;
  user: {
    email: string;
    password: string;
  };
}

export interface LoginResponse {
  token: string;
  user: AuthUser;
}
