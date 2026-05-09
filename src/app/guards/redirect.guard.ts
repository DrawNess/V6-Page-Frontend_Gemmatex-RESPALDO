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
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

@Injectable({
  providedIn: 'root'
})

export class RedirectGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly tokenService: TokenService,
    private readonly router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkRedirect();
  }

  canActivateChild(_childRoute: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean | UrlTree {
    return this.checkRedirect();
  }

  private readonly PANEL_ROLES = ['admin', 'branch_admin', 'seller', 'staff'];

  private checkRedirect(): boolean | UrlTree {
    const isAuthenticated = this.tokenService.isAuthenticated();

    if (!isAuthenticated) {
      this.tokenService.removeToken();
      return true;
    }

    const roles = this.tokenService.getRolesFromToken().map(r => r.toLowerCase());
    if (roles.some(r => this.PANEL_ROLES.includes(r))) {
      return this.router.createUrlTree([ROUTE_CONSTANTS.SECRET_BASE, ROUTE_CONSTANTS.ADMIN.MENU]);
    }

    return this.router.createUrlTree([`/${ROUTE_CONSTANTS.USER.BASE}`]);
  }
}
