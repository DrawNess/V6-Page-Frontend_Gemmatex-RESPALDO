import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable, of, switchMap, throwError } from 'rxjs';
import { ApiUser, ApiRole, ApiUserRole } from '@shared/models/user-portal.model';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { ProfileService } from './profile.service';
import { catchError, map } from 'rxjs/operators';

interface CreateUserPayload {
  email: string;
  password: string;
}

interface AssignRolePayload {
  roleId: number;
  branchId: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {

  private readonly apiUrl = environment.API_URL;

  constructor(
    private readonly http: HttpClient,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly profileService: ProfileService
  ) {}

  getUsers(): Observable<ApiUser[]> {
    return this.http.get<ApiUser[] | { data?: ApiUser[]; users?: ApiUser[] }>(`${this.apiUrl}/users`).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.data ?? response.users ?? [];
      })
    );
  }

  getUserById(userId: number): Observable<ApiUser> {
    return this.http.get<ApiUser>(`${this.apiUrl}/users/${userId}`);
  }

  createUser(payload: CreateUserPayload): Observable<ApiUser> {
    return this.http.post<ApiUser>(`${this.apiUrl}/users`, payload);
  }

  updateUser(
    userId: number,
    payload: Partial<Pick<ApiUser, 'email' | 'isEmailVerified'>>
  ): Observable<ApiUser> {
    return this.http.patch<ApiUser>(`${this.apiUrl}/users/${userId}`, payload);
  }

  getRoles(): Observable<ApiRole[]> {
    return this.http.get<ApiRole[]>(`${this.apiUrl}/roles`);
  }

  getUserRoles(userId: number): Observable<ApiUserRole[]> {
    return this.http.get<ApiUserRole[]>(`${this.apiUrl}/users/${userId}/roles`);
  }

  assignRole(userId: number, payload: AssignRolePayload): Observable<ApiUserRole> {
    return this.http.post<ApiUserRole>(`${this.apiUrl}/users/${userId}/roles`, payload);
  }

  revokeRole(userId: number, userRoleId: number): Observable<{ id: number; message: string }> {
    return this.http.delete<{ id: number; message: string }>(`${this.apiUrl}/users/${userId}/roles/${userRoleId}`);
  }

  deleteUser(userId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${userId}`);
  }

  getCurrentUserId(): number | null {
    const fromToken = this.tokenService.getUserIdFromToken();
    if (fromToken) {
      return fromToken;
    }
    return this.sessionService.getCurrentUserIdFromSession();
  }

  private resolveCurrentUserId(): Observable<number> {
    const fromSessionOrToken = this.getCurrentUserId();

    return this.profileService.getMe().pipe(
      map((me) => {
        const userId = Number(me?.userId);
        const customerId = Number(me?.customerId);
        if (userId > 0) {
          if (customerId > 0) {
            this.sessionService.saveIdentity(userId, customerId);
          }
          return userId;
        }
        if (fromSessionOrToken) {
          return fromSessionOrToken;
        }
        throw new Error('USER_ID_NOT_FOUND');
      }),
      catchError(() => {
        if (fromSessionOrToken) {
          return of(fromSessionOrToken);
        }
        return throwError(() => new Error('USER_ID_NOT_FOUND'));
      })
    );
  }

  getCurrentUser(): Observable<ApiUser> {
    return this.resolveCurrentUserId().pipe(
      switchMap((userId) => this.getUserById(userId))
    );
  }
}
