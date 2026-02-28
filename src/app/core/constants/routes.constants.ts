/**
 * Constantes de rutas de la aplicación
 */
export const ROUTE_CONSTANTS = {
  /**
   * Prefijo base para rutas administrativas.
   * Nota: no es un mecanismo de seguridad, la protección real la hacen guard/backend.
   */
  SECRET_BASE: 'administracion-central-gemmatex-panel-interno',

  /**
   * Rutas públicas principales
   */
  PUBLIC: {
    HOME: '',
    ABOUT: 'about',
    PRODUCT_DETAIL: 'product/:id',
    SERVICIOS: 'servicios',
    SERVICIO_TECNICO: 'servicio-tecnico',
    ENCUENTRANOS: 'encuentranos',
    CATALOGO: 'catalogo',
    PRODUCTOS: 'productos',
    OFERTAS: 'ofertas',
    CHECKOUT: 'checkout',
    SHIPPING: 'shipping',
    RECURSOS: {
      PERFILES_COLOR: 'recursos/perfiles-de-color',
      PDFS: 'recursos/pdfs'
    },
    EMPRESA: {
      SOBRE_NOSOTROS: 'empresa/sobre-nosotros'
    }
  },

  /**
   * Rutas de autenticación
   */
  AUTH: {
    LOGIN: 'auth/login',
    REGISTER: 'auth/register',
    RECOVERY: 'auth/recovery',
    RESET_PASSWORD: 'auth/reset-password',
    VERIFY_SUCCESS: 'verify-success',
    VERIFY_EMAIL: 'verifyEmail',
    VERIFY_REQUEST: 'auth/verify-request'
  },

  /**
   * Rutas administrativas (requieren autenticación)
   */
  ADMIN: {
    MENU_SECRETO: 'menu-secreto',
    PANEL_PRODUCTOS: 'panel-productos',
    OFFERS_MENU: 'offers-menu',
    MENU: 'menu',
    CATEGORIES: 'categories',
    SUBCATEGORIES: 'subcategories',
    PRODUCTS: 'products',
    MENU_ADDS: 'menu-adds',
    HERO_SLIDES: 'menu-adds/hero-slides',
    OFFERS_ADDS: 'menu-adds/offers-adds',
    PROMO: 'menu-adds/promo'
  },

  /**
   * Rutas para cuenta de cliente (customer)
   */
  USER: {
    BASE: 'mi-cuenta',
    INFO: 'informacion',
    ORDERS: 'pedidos'
  }
} as const;
