import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@services/token.service';

const PANEL_ROLES = new Set(['admin', 'branch_admin', 'seller', 'staff']);

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
