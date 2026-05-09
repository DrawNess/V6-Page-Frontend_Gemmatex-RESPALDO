import { Injectable } from '@angular/core';
import { getCookie, setCookie, removeCookie } from 'typescript-cookie'

interface JwtPayload {
  sub?: number | string;
  /** @deprecated — API-V6: use roles[] */
  role?: string;
  roles?: string[];
  branches?: number[];
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

  getRolesFromToken(): string[] {
    const payload = this.parsePayload();
    if (Array.isArray(payload?.roles)) return payload!.roles as string[];
    if (typeof payload?.role === 'string') return [payload.role];
    return [];
  }

  hasRole(role: string): boolean {
    return this.getRolesFromToken().map(r => r.toLowerCase()).includes(role.toLowerCase());
  }

  getBranchesFromToken(): number[] {
    const payload = this.parsePayload();
    return Array.isArray(payload?.branches) ? (payload!.branches as number[]) : [];
  }

  /** @deprecated — use getRolesFromToken() or hasRole() */
  getRoleFromToken(): string | null {
    const roles = this.getRolesFromToken();
    return roles[0] ?? null;
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
