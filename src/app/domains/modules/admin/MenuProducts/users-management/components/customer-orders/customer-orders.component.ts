import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiCustomer, ApiOrder, ApiOrderItem } from '@shared/models/user-portal.model';
import { CustomerService } from '@shared/services/customer.service';
import { OrderService } from '@shared/services/order.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-customer-orders',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './customer-orders.component.html',
})
export class CustomerOrdersComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orderService = inject(OrderService);
  private readonly customerService = inject(CustomerService);

  private readonly basePath = `/${ROUTE_CONSTANTS.SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.USERS}/customers`;

  readonly customerId = signal<number | null>(null);
  readonly customer = signal<ApiCustomer | null>(null);
  readonly orders = signal<ApiOrder[]>([]);
  readonly selected = signal<ApiOrder | null>(null);
  readonly loading = signal(false);
  readonly detailLoading = signal(false);
  readonly errorMsg = signal('');

  readonly scoped = computed(() => {
    const id = this.customerId();
    if (!id) return [];
    return this.orders().filter(o => {
      const direct = Number(o.customerId);
      const nested = Number(o.customer?.id);
      return direct === id || nested === id;
    });
  });

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('customerId'));
      if (Number.isInteger(id) && id > 0) {
        this.customerId.set(id);
        this.fetchCustomer(id);
        this.fetchOrders(id);
      }
    });
  }

  fetchCustomer(id: number): void {
    this.customerService.getCustomerById(id).pipe(catchError(() => of(null))).subscribe(c => this.customer.set(c));
  }

  fetchOrders(_customerId: number): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.orderService.getOrders({ pageSize: 100 }).subscribe({
      next: (orders) => {
        console.log('[customer-orders] fetched', orders.length, 'orders. Sample:', orders[0]);
        console.log('[customer-orders] looking for customerId:', this.customerId());
        const sorted = [...orders].sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        });
        this.orders.set(sorted);
        this.loading.set(false);
      },
      error: (err) => {
        console.error('[customer-orders] fetch error', err);
        this.errorMsg.set('No se pudo cargar pedidos.');
        this.loading.set(false);
      },
    });
  }

  back(): void {
    const id = this.customerId();
    if (id) this.router.navigate([this.basePath, id]);
    else this.router.navigate([this.basePath]);
  }

  toggle(order: ApiOrder): void {
    if (this.selected()?.id === order.id) {
      this.selected.set(null);
      return;
    }
    this.selected.set(order);
    this.detailLoading.set(true);
    this.orderService.getOrderById(order.id).subscribe({
      next: (full) => { this.selected.set(full); this.detailLoading.set(false); },
      error: () => this.detailLoading.set(false),
    });
  }

  items(order: ApiOrder | null): ApiOrderItem[] {
    return Array.isArray(order?.items) ? order!.items : [];
  }

  total(order: ApiOrder | null): number {
    if (!order) return 0;
    if (typeof order.total === 'number') return order.total;
    return this.items(order).reduce((sum, item) => {
      const amount = Number(item?.amount ?? item?.OrderProduct?.amount ?? 0);
      const price = Number(item?.OrderProduct?.unitPrice ?? item?.price ?? 0);
      return sum + amount * price;
    }, 0);
  }

  trackById = (_: number, o: ApiOrder) => o.id;
}
