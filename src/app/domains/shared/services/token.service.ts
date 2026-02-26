import { Injectable } from '@angular/core';
import { getCookie, setCookie, removeCookie } from 'typescript-cookie'

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  constructor() {}
  saveToken(token: string) {
    setCookie('token', token, { expires: 365, path: '/' });
  }

  getToken(){
    const token = getCookie('token');
    return token;
  }

  getRoleFromToken(): string | null {
    const token = this.getToken();
    if (!token) {
      return null;
    }

    try {
      const payloadPart = token.split('.')[1];
      if (!payloadPart) {
        return null;
      }

      const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
      const payload = JSON.parse(atob(padded)) as { role?: unknown };

      return typeof payload.role === 'string' ? payload.role : null;
    } catch {
      return null;
    }
  }

  removeToken() {
    removeCookie('token');
  }
}
