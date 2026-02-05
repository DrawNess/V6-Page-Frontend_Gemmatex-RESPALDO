import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ROUTE_CONSTANTS } from '../constants/routes.constants';

/**
 * Guard para proteger rutas administrativas
 *
 * TODO: Implementar lógica de autenticación real
 * Actualmente solo verifica que la ruta contenga el prefijo secreto
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);

  // Verificar si la URL contiene el prefijo secreto
  const isAdminRoute = state.url.includes(ROUTE_CONSTANTS.SECRET_BASE);

  if (!isAdminRoute) {
    // Si no es una ruta admin, permitir acceso
    return true;
  }

  // TODO: Implementar verificación de autenticación real
  // const authService = inject(AuthService);
  // if (!authService.isAuthenticated() || !authService.isAdmin()) {
  //   router.navigate(['/auth/login']);
  //   return false;
  // }

  // Por ahora, permitir acceso a rutas admin (solo protegidas por URL secreta)
  return true;
};
