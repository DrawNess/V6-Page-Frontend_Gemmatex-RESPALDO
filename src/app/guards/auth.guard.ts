import { CanActivateFn, Router } from '@angular/router';

import { TokenService } from '@services/token.service';

const tokenService = new TokenService();
const router = new Router();

export const authGuard: CanActivateFn = (route, state) => {
  const token = tokenService.getToken();
  if (!token) {
    router.navigate(['/auth/login']);
    return false;
  }
  return true;
};
