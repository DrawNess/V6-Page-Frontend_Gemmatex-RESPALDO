import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';

import { Observable, tap } from 'rxjs';
import { TokenService } from '@services/token.service';
import { ResponseLogin, RegisterCustomerDTO } from '@shared/models/auth.model';



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
    private tokenService: TokenService
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
    this.tokenService.removeToken();
  }
}
