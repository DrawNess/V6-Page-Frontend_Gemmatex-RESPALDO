import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable, of, switchMap, throwError } from 'rxjs';
import { ApiUser } from '@shared/models/user-portal.model';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { ProfileService } from './profile.service';
import { catchError, map } from 'rxjs/operators';

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

  getUserById(userId: number): Observable<ApiUser> {
    return this.http.get<ApiUser>(`${this.apiUrl}/users/${userId}`);
  }

  updateUser(userId: number, payload: Partial<Pick<ApiUser, 'email'>>): Observable<ApiUser> {
    return this.http.patch<ApiUser>(`${this.apiUrl}/users/${userId}`, payload);
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
