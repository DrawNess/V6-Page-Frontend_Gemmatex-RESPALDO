import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot,
  UrlTree
} from '@angular/router';
import { TokenService } from '@services/token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  // Inyectamos el servicio que lee el token y el router para redirecciones.
  constructor(
    private readonly tokenService: TokenService,
    private readonly router: Router
  ) {}

  // Protege rutas normales: si no hay sesión válida, se bloquea el acceso.
  canActivate(_route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkAuth(state);
  }

  // Protege rutas hijas reutilizando la misma validación.
  canActivateChild(_childRoute: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkAuth(state);
  }

  // Valida si existe token; si no existe, construye redirección al login.
  private checkAuth(state: RouterStateSnapshot): boolean | UrlTree {
    const isAuthenticated = this.tokenService.isAuthenticated();
    if (!isAuthenticated) {
      this.tokenService.removeToken();
      // Guardamos la URL original para regresar después de autenticarse.
      return this.router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url }
      });
    }
    // Con token presente, permitimos navegar.
    return true;
  }
}
