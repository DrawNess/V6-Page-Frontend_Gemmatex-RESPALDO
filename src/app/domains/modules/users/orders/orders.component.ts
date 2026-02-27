import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiCustomer, ApiOrder, ApiOrderItem } from '@shared/models/user-portal.model';
import { OrderService } from '@shared/services/order.service';
import { CustomerService } from '@shared/services/customer.service';

@Component({
  selector: 'app-orders',
  imports: [CommonModule, RouterLink],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css',
})
export class OrdersComponent implements OnInit {
  readonly accountPath = `/${ROUTE_CONSTANTS.USER.BASE}`;

  loading = false;
  errorMsg = '';
  orders: ApiOrder[] = [];
  customer: ApiCustomer | null = null;
  selectedOrder: ApiOrder | null = null;
  selectedOrderId: number | null = null;

  constructor(
    private readonly orderService: OrderService,
    private readonly customerService: CustomerService
  ) {}

  ngOnInit(): void {
    this.loadCustomer();
    this.loadOrders();
  }

  private loadCustomer(): void {
    this.customerService.getCurrentCustomer().pipe(
      catchError(() => of(null))
    ).subscribe((customer) => {
      this.customer = customer;
    });
  }

  loadOrders(): void {
    this.loading = true;
    this.errorMsg = '';

    this.orderService.getMyOrders().pipe(
      catchError(() => of([] as ApiOrder[])),
      switchMap((orders) => {
        if (orders.length > 0) {
          return of(orders);
        }
        return this.orderService.getOrders();
      }),
    ).subscribe({
      next: (orders) => {
        this.orders = [...orders].sort((a, b) => {
          const aTime = new Date(a.createdAt ?? 0).getTime();
          const bTime = new Date(b.createdAt ?? 0).getTime();
          return bTime - aTime;
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'No se pudieron cargar tus pedidos.';
      },
    });
  }

  trackByOrder(_: number, order: ApiOrder): number {
    return order.id;
  }

  getOrderItems(order: ApiOrder | null): ApiOrderItem[] {
    if (!order) {
      return [];
    }
    const raw = (order as any).items ?? (order as any).orderItems ?? (order as any).products ?? [];
    return Array.isArray(raw) ? (raw as ApiOrderItem[]) : [];
  }

  getOrderCustomerName(order: ApiOrder | null): string {
    if (!order?.customer) {
      return this.getCustomerFullName();
    }
    const fullName = `${order.customer.name ?? ''} ${order.customer.lastName ?? ''}`.trim();
    return fullName || this.getCustomerFullName();
  }

  getOrderCustomerEmail(order: ApiOrder | null): string {
    const email = (order as any)?.customer?.user?.email;
    if (typeof email === 'string' && email.trim()) {
      return email;
    }
    return this.customer?.user?.email ?? this.customer?.name ?? '-';
  }

  getItemName(item: ApiOrderItem): string {
    const product = (item as any).product ?? (item as any).Product ?? null;
    const name = product?.name ?? (item as any).name ?? null;
    if (typeof name === 'string' && name.trim()) {
      return name;
    }
    const productId = item.productId ?? (item as any).product?.id;
    return productId ? `Producto #${productId}` : 'Producto';
  }

  getItemAmount(item: ApiOrderItem): number {
    return Number(item.amount ?? item.OrderProduct?.amount ?? 0);
  }

  getItemPrice(item: ApiOrderItem): number {
    return Number(item.price ?? (item as any).discountPrice ?? 0);
  }

  getItemProductId(item: ApiOrderItem): number | string {
    return item.productId ?? item.OrderProduct?.productId ?? item.id ?? '-';
  }

  getItemSku(item: ApiOrderItem): string {
    return String(item.sku ?? (item as any).product?.sku ?? '-');
  }

  getItemImage(item: ApiOrderItem): string {
    return String(item.imageUrl ?? (item as any).product?.imageUrl ?? '/assets/placeholders/product.svg');
  }

  getItemSubtotal(item: ApiOrderItem): number {
    const amount = this.getItemAmount(item);
    const price = this.getItemPrice(item);
    return amount * price;
  }

  getCustomerFullName(): string {
    const fullName = `${this.customer?.name ?? ''} ${this.customer?.lastName ?? ''}`.trim();
    return fullName || 'Cliente';
  }

  toggleDetail(order: ApiOrder): void {
    if (this.selectedOrderId === order.id) {
      this.selectedOrder = null;
      this.selectedOrderId = null;
      return;
    }
    this.selectedOrderId = order.id;
    this.selectedOrder = order;
  }

}
