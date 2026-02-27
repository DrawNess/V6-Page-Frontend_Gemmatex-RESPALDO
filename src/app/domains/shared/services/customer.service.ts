import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable, of, switchMap, throwError } from 'rxjs';
import { ApiCustomer } from '@shared/models/user-portal.model';
import { UserService } from './user.service';
import { SessionService } from './session.service';
import { catchError } from 'rxjs/operators';
import { ProfileService } from './profile.service';

@Injectable({
  providedIn: 'root',
})
export class CustomerService {
  private readonly apiUrl = environment.API_URL;

  constructor(
    private readonly http: HttpClient,
    private readonly userService: UserService,
    private readonly sessionService: SessionService,
    private readonly profileService: ProfileService
  ) {}

  getCustomerById(customerId: number): Observable<ApiCustomer> {
    return this.http.get<ApiCustomer>(`${this.apiUrl}/customers/${customerId}`);
  }

  updateCustomer(
    customerId: number,
    payload: Partial<Pick<ApiCustomer, 'name' | 'lastName' | 'phone'>>
  ): Observable<ApiCustomer> {
    return this.http.patch<ApiCustomer>(`${this.apiUrl}/customers/${customerId}`, payload);
  }

  private buildCandidateIds(userId: number): number[] {
    const candidateIds = new Set<number>();
    const fromSession = this.sessionService.getCurrentCustomerIdFromSession();
    const fromMap = this.sessionService.getCustomerIdForUser(userId);

    if (fromSession) {
      candidateIds.add(fromSession);
    }
    if (fromMap) {
      candidateIds.add(fromMap);
    }

    // fallback para backends donde coinciden customer.id y user.id
    candidateIds.add(userId);

    return [...candidateIds];
  }

  private resolveByCandidates(userId: number, candidateIds: number[]): Observable<ApiCustomer> {
    const [candidate, ...rest] = candidateIds;
    if (!candidate) {
      return throwError(() => new Error('CUSTOMER_NOT_FOUND'));
    }

    return this.getCustomerById(candidate).pipe(
      switchMap((customer) => {
        this.sessionService.rememberCustomerForUser(userId, customer.id);
        return of(customer);
      }),
      catchError(() => this.resolveByCandidates(userId, rest))
    );
  }

  private resolveFromProfileMe(userId: number): Observable<number | null> {
    return this.profileService.getMe().pipe(
      switchMap((me) => {
        const meUserId = Number(me?.userId);
        const customerId = Number(me?.customerId);
        if (meUserId > 0 && customerId > 0) {
          this.sessionService.saveIdentity(meUserId, customerId);
          return of(customerId);
        }
        return of(null);
      }),
      catchError(() => of(null))
    );
  }

  getCurrentCustomer(): Observable<ApiCustomer> {
    return this.userService.getCurrentUser().pipe(
      switchMap((user) => {
        if (!user.id) {
          return throwError(() => new Error('CUSTOMER_USER_ID_NOT_FOUND'));
        }

        // Fuente principal: /profile/me para mapear userId -> customerId
        return this.resolveFromProfileMe(user.id).pipe(
          switchMap((customerIdFromProfile) => {
            if (customerIdFromProfile) {
              return this.getCustomerById(customerIdFromProfile).pipe(
                switchMap((customer) => {
                  this.sessionService.rememberCustomerForUser(user.id, customer.id);
                  return of(customer);
                })
              );
            }

            // Fallback para sesiones antiguas o backends con ids sincronizados.
            const candidateIds = this.buildCandidateIds(user.id);
            return this.resolveByCandidates(user.id, candidateIds);
          })
        );
      })
    );
  }
}
