export const environment = {
  production: false,

  /** Catálogo + órdenes + ACL local por sucursal (API-V6). */
  API_URL: 'http://localhost:1115/api/v1',

  /** Identidad, perfil, password, sesiones (SSO GEMMATEX). */
  SSO_URL: 'http://localhost:2106/api/v1',

  /** Identificador público de la app frente al SSO (header `X-Client-Id`). */
  SSO_CLIENT_ID: 'app_ecommerce_dev',

  WSP_LPZ: 71926087,
  WSP_CBBA: 78859336,
  WSP_EACEIBO: 67017253,
  WSP_EASATE: 69750231,
  WSP_SCZ: 78346372
};
