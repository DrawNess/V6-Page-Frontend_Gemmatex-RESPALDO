import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { TokenService } from '@services/token.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

export const adminGuard: CanActivateFn = (_route, state) => {
  const router = inject(Router);
  const tokenService = inject(TokenService);

  const isAuthenticated = tokenService.isAuthenticated();

  if (isAuthenticated && tokenService.hasRole('admin')) {
    return true;
  }

  if (isAuthenticated) {
    return router.createUrlTree([`/${ROUTE_CONSTANTS.USER.BASE}`]);
  }

  tokenService.removeToken();

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
};
