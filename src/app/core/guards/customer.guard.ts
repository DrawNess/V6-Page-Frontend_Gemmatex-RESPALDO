import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@services/token.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

const CUSTOMER_ROLES = new Set(['customer', 'user', 'cliente']);
const PANEL_ROLES = new Set(['admin', 'branch_admin', 'seller', 'staff']);

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
