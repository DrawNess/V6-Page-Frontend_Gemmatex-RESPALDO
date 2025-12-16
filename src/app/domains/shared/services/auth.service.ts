import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs';

export interface LoginResponse {
  token: string;
  user: any;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private apiUrl = environment.API_URL;

  constructor(
    private http: HttpClient
  ){}

  login( email: string, password: string ) {
    return this.http.post<LoginResponse>(`${this.apiUrl}/auth/login`, {
      email,
      password
    });
  }

}
