import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '@environments/environment';
import { map, Observable } from 'rxjs';
import { ApiOrder } from '@shared/models/user-portal.model';

interface AddOrderItemDTO {
  orderId: number;
  productId: number;
  amount: number;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private readonly apiUrl = environment.API_URL;

  constructor(private readonly http: HttpClient) {}

  createOrder(): Observable<ApiOrder> {
    return this.http.post<ApiOrder>(`${this.apiUrl}/orders`, {});
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

  getOrders(): Observable<ApiOrder[]> {
    return this.http.get<ApiOrder[] | { data?: ApiOrder[]; orders?: ApiOrder[] }>(`${this.apiUrl}/orders`).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.data ?? response.orders ?? [];
      })
    );
  }

  getMyOrders(): Observable<ApiOrder[]> {
    return this.http.get<ApiOrder[] | { data?: ApiOrder[]; orders?: ApiOrder[] }>(`${this.apiUrl}/profile/my-orders`).pipe(
      map((response) => {
        if (Array.isArray(response)) {
          return response;
        }
        return response.data ?? response.orders ?? [];
      })
    );
  }
}
