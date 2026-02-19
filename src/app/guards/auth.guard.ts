import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  CanActivateChild,
  Router,
  RouterStateSnapshot
} from '@angular/router';
import { TokenService } from '@services/token.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate, CanActivateChild {
  constructor(
    private readonly tokenService: TokenService,
    private readonly router: Router
  ) {}

  canActivate(_route: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    return this.checkAuth();
  }

  canActivateChild(_childRoute: ActivatedRouteSnapshot, _state: RouterStateSnapshot): boolean {
    return this.checkAuth();
  }

  private checkAuth(): boolean {
    const token = this.tokenService.getToken();
    if (!token) {
      this.router.navigate(['/auth/login']);
      return false;
    }

    return true;
  }
}
