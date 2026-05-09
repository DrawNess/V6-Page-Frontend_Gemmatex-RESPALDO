import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';

import { Observable, catchError, map, of, switchMap, tap } from 'rxjs';
import { TokenService } from '@services/token.service';
import { ResponseLogin, RegisterCustomerDTO } from '@shared/models/auth.model';
import { SessionService } from './session.service';
import { ProfileService } from './profile.service';
import { CartService } from './cart.service';
import { BranchCacheService } from './branch-cache.service';



/* export interface RegisterCustomerDTO {
  name: string;
  lastName: string;
  phone: string;
  user: {
    email: string;
    password: string;
  };
} */

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private apiUrl = environment.API_URL;

  constructor(
    private http: HttpClient,
    private tokenService: TokenService,
    private sessionService: SessionService,
    private profileService: ProfileService,
    private cartService: CartService,
    private branchCache: BranchCacheService
  ){}

  login( email: string, password: string ) {
    return this.http.post<ResponseLogin>(`${this.apiUrl}/auth/login`, {
      email,
      password
    })
    .pipe(
      tap(response => {
        const token = response.token ?? response.access_token;
        if (token) {
          this.tokenService.saveToken(token);
        }
        this.sessionService.saveLogin(response.user);
        this.cartService.syncWithCurrentSession();
        this.branchCache.load();
      }),
      switchMap((response) => {
        // Panel users don't have a customer profile — skip getMe() to avoid 401 wiping the token
        const PANEL_ROLES = ['admin', 'branch_admin', 'seller', 'staff'];
        const roles = this.tokenService.getRolesFromToken().map(r => r.toLowerCase());
        if (roles.some(r => PANEL_ROLES.includes(r))) {
          return of(response);
        }

        return this.profileService.getMe().pipe(
          tap((me) => {
            if (Number(me?.userId) > 0 && Number(me?.customerId) > 0) {
              this.sessionService.saveIdentity(me.userId, me.customerId);
              this.cartService.syncWithCurrentSession();
            }
          }),
          map(() => response),
          catchError(() => of(response))
        );
      })
    )
  }

/*   register( name: string, lastName: string, phone: string, email: string, password: string ): Observable<any> {
    return this.http.post(`${this.apiUrl}/auth/customer`, {
      name,
      lastName,
      phone,
      email,
      password,
    });
  } */

  register(payload: RegisterCustomerDTO): Observable<any> {
    return this.http.post(`${this.apiUrl}/customers`, payload);
  }

  sendVerifyEmail(email: string) {
    return this.http.post(`${this.apiUrl}/auth/send-verify-email`, { email });
  }

  verifyEmail(token: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/verify-email`, { token });
  }

  recoverPassword(email: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/recover-password`, { email });
  }

  changePassword(token: string, newPassword: string) {
    return this.http.post<{ message: string }>(`${this.apiUrl}/auth/change-password`, { token, newPassword });
  }
  logout() {
    this.cartService.syncWithCurrentSession();
    this.tokenService.removeToken();
    this.sessionService.clearSession();
    this.branchCache.clear();
    this.cartService.syncWithCurrentSession();
  }
}
