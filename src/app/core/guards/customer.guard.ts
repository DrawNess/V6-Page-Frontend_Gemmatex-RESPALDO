import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@services/token.service';

const CUSTOMER_ROLES = new Set(['customer', 'user', 'cliente']);

export const customerGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  const isAuthenticated = tokenService.isAuthenticated();
  const role = tokenService.getRoleFromToken()?.toLowerCase();

  if (isAuthenticated && role && CUSTOMER_ROLES.has(role)) {
    return true;
  }

  tokenService.removeToken();

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};
