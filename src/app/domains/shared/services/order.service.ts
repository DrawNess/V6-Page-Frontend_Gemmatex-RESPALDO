import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { map, Observable } from 'rxjs';
import { ApiOrder, ApiPaginatedResponse } from '@shared/models/user-portal.model';

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

  // ── Pedidos ────────────────────────────────────────────

  createOrder(detail?: string): Observable<ApiOrder> {
    const body = detail?.trim() ? { detail: detail.trim() } : {};
    return this.http.post<ApiOrder>(`${this.apiUrl}/orders`, body);
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
    const query: Record<string, string> = {};
    if (params?.status)   query['status']   = params.status;
    if (params?.page)     query['page']     = String(params.page);
    if (params?.pageSize) query['pageSize'] = String(params.pageSize);

    return this.http.get<ApiOrder[] | ApiPaginatedResponse<ApiOrder> | { data?: ApiOrder[]; orders?: ApiOrder[] }>(
      `${this.apiUrl}/orders`, { params: query }
    ).pipe(
      map((response) => {
        if (Array.isArray(response)) return response;
        if ('data' in response && Array.isArray(response.data)) return response.data;
        return (response as any).orders ?? [];
      })
    );
  }

  /** Solo admin — cantidad de pedidos pendientes */
  getPendingCount(): Observable<{ pendientes: number }> {
    return this.http.get<{ pendientes: number }>(`${this.apiUrl}/orders/pending-count`);
  }

  updateOrderStatus(orderId: number, status: string): Observable<ApiOrder> {
    return this.http.patch<ApiOrder>(`${this.apiUrl}/orders/${orderId}`, { status });
  }

  deleteOrder(orderId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/orders/${orderId}`);
  }

  // ── Items ──────────────────────────────────────────────

  addItem(payload: AddOrderItemDTO): Observable<ApiOrder> {
    return this.http.post<ApiOrder>(`${this.apiUrl}/orders/add-item`, payload);
  }

  updateItem(orderId: number, itemId: number, amount: number): Observable<ApiOrder> {
    return this.http.patch<ApiOrder>(
      `${this.apiUrl}/orders/${orderId}/items/${itemId}`,
      { amount }
    );
  }

  removeItem(orderId: number, itemId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(
      `${this.apiUrl}/orders/${orderId}/items/${itemId}`
    );
  }

  // ── Mis pedidos (customer) ─────────────────────────────

  getMyOrders(params?: { status?: string; page?: number; pageSize?: number }): Observable<ApiOrder[]> {
    const query: Record<string, string> = {};
    if (params?.status)   query['status']   = params.status;
    if (params?.page)     query['page']     = String(params.page);
    if (params?.pageSize) query['pageSize'] = String(params.pageSize);

    return this.http.get<{ data: ApiOrder[]; meta?: unknown } | ApiOrder[]>(
      `${this.apiUrl}/orders`, { params: query }
    ).pipe(
      map(response => {
        if (Array.isArray(response)) return response;
        return response?.data ?? [];
      })
    );
  }
}
