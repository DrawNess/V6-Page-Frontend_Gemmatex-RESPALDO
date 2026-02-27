import { Injectable } from '@angular/core';
import { getCookie, setCookie, removeCookie } from 'typescript-cookie'

interface JwtPayload {
  sub?: number | string;
  role?: string;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

@Injectable({
  providedIn: 'root',
})
export class TokenService {
  constructor() {}
  saveToken(token: string) {
    setCookie('token', token, {
      expires: 1 / 24, // 1 hora, alineado al JWT del backend
      path: '/',
      sameSite: 'Strict',
      secure: window.location.protocol === 'https:',
    });
  }

  getToken(){
    const token = getCookie('token');
    return token;
  }

  private parsePayload(): JwtPayload | null {
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
      return JSON.parse(atob(padded)) as JwtPayload;
    } catch {
      return null;
    }
  }

  getRoleFromToken(): string | null {
    const payload = this.parsePayload();
    return typeof payload?.role === 'string' ? payload.role : null;
  }

  getUserIdFromToken(): number | null {
    const payload = this.parsePayload();
    const sub = payload?.sub;

    if (typeof sub === 'number') {
      return sub;
    }

    if (typeof sub === 'string' && sub.trim() !== '' && !Number.isNaN(Number(sub))) {
      return Number(sub);
    }

    return null;
  }

  isTokenExpired(): boolean {
    const payload = this.parsePayload();
    if (!payload?.exp || typeof payload.exp !== 'number') {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp <= now;
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    if (!token) {
      return false;
    }
    return !this.isTokenExpired();
  }

  removeToken() {
    removeCookie('token', { path: '/' });
  }
}
