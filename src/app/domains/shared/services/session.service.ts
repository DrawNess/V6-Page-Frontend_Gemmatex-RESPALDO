import { Injectable } from '@angular/core';
import { AuthUser } from '@shared/models/auth.model';

interface SessionState {
  userId?: number;
  email?: string;
  role?: string;
  customerId?: number;
}

type CustomerMap = Record<string, number>;

@Injectable({
  providedIn: 'root',
})
export class SessionService {
  private readonly sessionKey = 'app_session_state_v1';
  private readonly customerMapKey = 'app_customer_map_v1';

  private readSession(): SessionState {
    try {
      const raw = localStorage.getItem(this.sessionKey);
      return raw ? (JSON.parse(raw) as SessionState) : {};
    } catch {
      return {};
    }
  }

  private writeSession(session: SessionState): void {
    localStorage.setItem(this.sessionKey, JSON.stringify(session));
  }

  private readCustomerMap(): CustomerMap {
    try {
      const raw = localStorage.getItem(this.customerMapKey);
      return raw ? (JSON.parse(raw) as CustomerMap) : {};
    } catch {
      return {};
    }
  }

  private writeCustomerMap(map: CustomerMap): void {
    localStorage.setItem(this.customerMapKey, JSON.stringify(map));
  }

  private toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
    return null;
  }

  saveLogin(user: AuthUser | undefined): void {
    const userId = this.toNumber(user?.id);
    const session = this.readSession();
    const customerId = userId ? this.getCustomerIdForUser(userId) : null;

    this.writeSession({
      ...session,
      userId: userId ?? undefined,
      email: typeof user?.email === 'string' ? user.email : undefined,
      role: typeof user?.role === 'string' ? user.role : undefined,
      customerId: customerId ?? undefined,
    });
  }

  saveIdentity(userId: number, customerId: number): void {
    const session = this.readSession();
    this.writeSession({
      ...session,
      userId,
      customerId,
    });
    this.rememberCustomerForUser(userId, customerId);
  }

  rememberCustomerForUser(userId: number, customerId: number): void {
    const map = this.readCustomerMap();
    map[String(userId)] = customerId;
    this.writeCustomerMap(map);

    const session = this.readSession();
    if (session.userId === userId) {
      this.writeSession({ ...session, customerId });
    }
  }

  getCustomerIdForUser(userId: number): number | null {
    const map = this.readCustomerMap();
    const value = map[String(userId)];
    return this.toNumber(value);
  }

  getCurrentUserIdFromSession(): number | null {
    return this.toNumber(this.readSession().userId);
  }

  getCurrentCustomerIdFromSession(): number | null {
    return this.toNumber(this.readSession().customerId);
  }

  clearSession(): void {
    localStorage.removeItem(this.sessionKey);
  }
}
