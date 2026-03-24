import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { map, Observable } from 'rxjs';
import { ApiOrder } from '@shared/models/user-portal.model';

interface AddOrderItemDTO {
  orderId: number;
  variantId: number;
  amount: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly apiUrl = environment.API_URL;

  constructor(private readonly http: HttpClient) {}

  createOrder(detail?: string): Observable<ApiOrder> {
    const body = detail?.trim() ? { detail: detail.trim() } : {};
    return this.http.post<ApiOrder>(`${this.apiUrl}/orders`, body);
  }

  addItem(payload: AddOrderItemDTO): Observable<ApiOrder> {
    return this.http.post<ApiOrder>(`${this.apiUrl}/orders/add-item`, payload);
  }

  getOrderById(orderId: number): Observable<ApiOrder> {
    return this.http.get<ApiOrder | { data?: ApiOrder; order?: ApiOrder }>(`${this.apiUrl}/orders/${orderId}`).pipe(
      map((response) => {
        if ('id' in (response as ApiOrder)) {
          return response as ApiOrder;
        }
        return (response as { data?: ApiOrder; order?: ApiOrder }).data
          ?? (response as { data?: ApiOrder; order?: ApiOrder }).order
          ?? ({} as ApiOrder);
      })
    );
  }

  getOrders(params?: { status?: string; page?: number; pageSize?: number }): Observable<ApiOrder[]> {
    const query: Record<string, string> = { pageSize: '100' };
    if (params?.status) query['status'] = params.status;
    if (params?.page)   query['page']   = String(params.page);
    if (params?.pageSize) query['pageSize'] = String(params.pageSize);

    return this.http.get<ApiOrder[] | { data?: ApiOrder[]; orders?: ApiOrder[] }>(
      `${this.apiUrl}/orders`, { params: query }
    ).pipe(
      map((response) => {
        if (Array.isArray(response)) return response;
        return (response as any).data ?? (response as any).orders ?? [];
      })
    );
  }

  updateOrderStatus(orderId: number, status: string): Observable<ApiOrder> {
    return this.http.patch<ApiOrder>(`${this.apiUrl}/orders/${orderId}`, { status });
  }

  getMyOrders(params?: { status?: string; page?: number; pageSize?: number }): Observable<ApiOrder[]> {
    const query: Record<string, string> = {};
    if (params?.status)   query['status']   = params.status;
    if (params?.page)     query['page']     = String(params.page);
    if (params?.pageSize) query['pageSize'] = String(params.pageSize);

    return this.http.get<{ data: ApiOrder[]; meta?: unknown }>(`${this.apiUrl}/orders`, { params: query }).pipe(
      map(response => Array.isArray(response) ? response : (response?.data ?? []))
    );
  }
}
