import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiCustomer, ApiOrder, ApiUser } from '@shared/models/user-portal.model';

export interface ProfileMeResponse {
  userId: number;
  customerId: number;
}

export interface ProfileMeDetailsResponse {
  user: ApiUser;
  customer: ApiCustomer | null;
}

export interface ProfileMeUpdatePayload {
  email?: string;
  name?: string;
  lastName?: string;
  phone?: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfileService {
  private readonly apiUrl = environment.API_URL;

  constructor(private readonly http: HttpClient) {}

  getMe(): Observable<ProfileMeResponse> {
    return this.http.get<ProfileMeResponse>(`${this.apiUrl}/profile/me`);
  }

  getMyOrders(params?: { status?: string; page?: number; pageSize?: number }): Observable<ApiOrder[]> {
    const query: Record<string, string> = {};
    if (params?.status)   query['status']   = params.status;
    if (params?.page)     query['page']     = String(params.page);
    if (params?.pageSize) query['pageSize'] = String(params.pageSize);

    return this.http
      .get<ApiOrder[] | { data?: ApiOrder[]; orders?: ApiOrder[] }>(
        `${this.apiUrl}/profile/my-orders`, { params: query }
      )
      .pipe(
        map((response) => {
          if (Array.isArray(response)) return response;
          return response.data ?? response.orders ?? [];
        })
      );
  }

  getMyOrderById(orderId: number): Observable<ApiOrder> {
    return this.http
      .get<ApiOrder | { data?: ApiOrder; order?: ApiOrder }>(`${this.apiUrl}/profile/my-orders/${orderId}`)
      .pipe(
        map((response) => {
          if ('id' in (response as ApiOrder)) return response as ApiOrder;
          return (response as { data?: ApiOrder; order?: ApiOrder }).data
            ?? (response as { data?: ApiOrder; order?: ApiOrder }).order
            ?? ({} as ApiOrder);
        })
      );
  }

  getMeDetails(): Observable<ProfileMeDetailsResponse> {
    return this.http
      .get<ProfileMeDetailsResponse | { data?: ProfileMeDetailsResponse }>(`${this.apiUrl}/profile/me/details`)
      .pipe(
        map((response) => {
          const details = (response as { data?: ProfileMeDetailsResponse }).data ?? (response as ProfileMeDetailsResponse);
          return {
            user: details?.user ?? ({} as ApiUser),
            customer: details?.customer ?? null,
          };
        })
      );
  }

  updateMe(payload: ProfileMeUpdatePayload): Observable<ProfileMeDetailsResponse> {
    return this.http
      .patch<ProfileMeDetailsResponse | { data?: ProfileMeDetailsResponse }>(`${this.apiUrl}/profile/me`, payload)
      .pipe(
        map((response) => {
          const details = (response as { data?: ProfileMeDetailsResponse }).data ?? (response as ProfileMeDetailsResponse);
          return {
            user: details?.user ?? ({} as ApiUser),
            customer: details?.customer ?? null,
          };
        })
      );
  }
}
