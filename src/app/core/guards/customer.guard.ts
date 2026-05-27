import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@services/token.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

// Tras la integración con SSO el rol del cliente final pasó de `customer`
// (legacy API-V6) a `client` (SSO). Aceptamos los antiguos por compatibilidad.
const CUSTOMER_ROLES = new Set(['client', 'customer', 'user', 'cliente']);
// Roles que indican panel (staff o admin). Se mantienen para que el guard
// del frontend del cliente NO mate la sesión cuando entra un staff.
const PANEL_ROLES = new Set([
  'admin',
  'super_admin',
  'staff',
  'branch_admin',
  'seller',
  'manager',
  'cashier',
  'viewer',
]);

export const customerGuard: CanActivateFn = (_route, _state) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  if (!tokenService.isAuthenticated()) {
    tokenService.removeToken();
    return router.createUrlTree(['/auth/login']);
  }

  const roles = tokenService.getRolesFromToken();

  if (roles.some(r => CUSTOMER_ROLES.has(r.toLowerCase()))) {
    return true;
  }

  // Panel users that land on /mi-cuenta → redirect to panel instead of killing session
  if (roles.some(r => PANEL_ROLES.has(r))) {
    return router.createUrlTree([ROUTE_CONSTANTS.SECRET_BASE, ROUTE_CONSTANTS.ADMIN.MENU]);
  }

  tokenService.removeToken();
  return router.createUrlTree(['/auth/login']);
};
