import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@services/token.service';

// Roles globales del SSO que dan acceso al panel administrativo.
// `staff` ya es suficiente — la sucursal específica se resuelve después
// vía la tabla `user_branches` del API-V6 (no llega en el JWT).
const PANEL_ROLES = new Set(['admin', 'super_admin', 'staff']);

export const panelGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  if (!tokenService.isAuthenticated()) {
    tokenService.removeToken();
    return router.createUrlTree(['/auth/login'], { queryParams: { returnUrl: state.url } });
  }

  const roles = tokenService.getRolesFromToken().map(r => r.toLowerCase());
  if (roles.some(r => PANEL_ROLES.has(r))) {
    return true;
  }

  return router.createUrlTree(['/mi-cuenta']);
};
