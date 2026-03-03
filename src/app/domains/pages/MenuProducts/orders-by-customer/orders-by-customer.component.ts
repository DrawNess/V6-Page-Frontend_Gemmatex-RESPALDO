import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiCustomer, ApiOrder, ApiOrderItem } from '@shared/models/user-portal.model';
import { CustomerService } from '@shared/services/customer.service';
import { OrderService } from '@shared/services/order.service';
import { forkJoin } from 'rxjs';

type CustomerOrdersSummary = {
  customerId: number;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

@Component({
  selector: 'app-orders-by-customer',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './orders-by-customer.component.html',
  styleUrl: './orders-by-customer.component.css',
})
export class OrdersByCustomerComponent {
  private readonly orderService = inject(OrderService);
  private readonly customerService = inject(CustomerService);
  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  readonly backMenuUrl = `${this.adminBase}/${ROUTE_CONSTANTS.ADMIN.MENU}`;
  readonly usersAdminUrl = `${this.adminBase}/${ROUTE_CONSTANTS.ADMIN.USERS}`;

  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');

  readonly orders = signal<ApiOrder[]>([]);
  readonly customers = signal<ApiCustomer[]>([]);
  readonly selectedCustomerId = signal<number | null>(null);
  readonly selectedOrderId = signal<number | null>(null);
  readonly searchText = signal('');

  readonly customersWithOrdersCount = computed(() => this.summaries().length);
  readonly totalOrdersCount = computed(() => this.orders().length);
  readonly grossTotal = computed(() =>
    this.orders().reduce((acc, order) => acc + this.getOrderTotal(order), 0)
  );

  readonly summaries = computed<CustomerOrdersSummary[]>(() => {
    const customersById = new Map<number, ApiCustomer>(
      this.customers().map((customer) => [Number(customer.id), customer])
    );
    const grouped = new Map<number, ApiOrder[]>();

    for (const order of this.orders()) {
      const customerId = this.toPositiveNumber(order.customerId);
      if (!customerId) {
        continue;
      }
      const list = grouped.get(customerId) ?? [];
      list.push(order);
      grouped.set(customerId, list);
    }

    const summaries: CustomerOrdersSummary[] = [];
    for (const [customerId, orders] of grouped.entries()) {
      const knownCustomer = customersById.get(customerId) ?? null;
      const orderWithCustomer = orders.find((item) => !!item.customer)?.customer ?? null;
      const customerName = this.resolveCustomerName(knownCustomer, orderWithCustomer);
      const customerEmail = this.resolveCustomerEmail(knownCustomer, orderWithCustomer);
      const customerPhone = knownCustomer?.phone ?? orderWithCustomer?.phone ?? '-';
      const totalSpent = orders.reduce((acc, order) => acc + this.getOrderTotal(order), 0);
      const lastOrderAt = orders
        .map((item) => item.createdAt)
        .filter((value): value is string => !!value)
        .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null;

      summaries.push({
        customerId,
        customerName,
        customerEmail,
        customerPhone,
        ordersCount: orders.length,
        totalSpent,
        lastOrderAt,
      });
    }

    return summaries.sort((a, b) => b.totalSpent - a.totalSpent);
  });

  readonly filteredSummaries = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) {
      return this.summaries();
    }

    return this.summaries().filter((summary) => {
      return (
        String(summary.customerId).includes(term) ||
        summary.customerName.toLowerCase().includes(term) ||
        summary.customerEmail.toLowerCase().includes(term) ||
        summary.customerPhone.toLowerCase().includes(term)
      );
    });
  });

  readonly selectedSummary = computed(() => {
    const customerId = this.selectedCustomerId();
    if (!customerId) {
      return null;
    }
    return this.summaries().find((item) => item.customerId === customerId) ?? null;
  });

  readonly selectedCustomerOrders = computed(() => {
    const customerId = this.selectedCustomerId();
    if (!customerId) {
      return [];
    }
    return this.orders()
      .filter((order) => this.toPositiveNumber(order.customerId) === customerId)
      .sort((a, b) => {
        const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  });

  readonly selectedOrder = computed(() => {
    const orderId = this.selectedOrderId();
    if (!orderId) {
      return null;
    }
    return this.selectedCustomerOrders().find((order) => order.id === orderId) ?? null;
  });

  constructor() {
    this.refresh();
  }

  refresh(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    forkJoin({
      orders: this.orderService.getOrders(),
      customers: this.customerService.getCustomers(),
    }).subscribe({
      next: ({ orders, customers }) => {
        this.orders.set(orders);
        this.customers.set(customers);
        this.loading.set(false);
        this.successMsg.set('Panel de pedidos actualizado.');

        if (!this.selectedCustomerId() && this.summaries().length > 0) {
          const first = this.summaries()[0];
          this.selectCustomer(first.customerId);
        }
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('No se pudo cargar pedidos/clientes. Verifica permisos de admin.');
      },
    });
  }

  selectCustomer(customerId: number): void {
    this.selectedCustomerId.set(customerId);
    const firstOrder = this.selectedCustomerOrders()[0];
    this.selectedOrderId.set(firstOrder?.id ?? null);
  }

  selectOrder(orderId: number): void {
    this.selectedOrderId.set(orderId);
  }

  getOrderItems(order: ApiOrder | null): ApiOrderItem[] {
    const raw = order?.items;
    return Array.isArray(raw) ? raw : [];
  }

  getOrderTotal(order: ApiOrder | null): number {
    if (!order) {
      return 0;
    }
    if (typeof order.total === 'number') {
      return order.total;
    }
    return this.getOrderItems(order).reduce((sum, item) => {
      const amount = Number(item.amount ?? item.OrderProduct?.amount ?? 0);
      const price = Number(item.price ?? 0);
      return sum + amount * price;
    }, 0);
  }

  getItemAmount(item: ApiOrderItem): number {
    return Number(item.amount ?? item.OrderProduct?.amount ?? 0);
  }

  getItemName(item: ApiOrderItem): string {
    return item.name ?? item.sku ?? `Producto #${item.productId ?? '-'}`;
  }

  getItemSubtotal(item: ApiOrderItem): number {
    return this.getItemAmount(item) * Number(item.price ?? 0);
  }

  private toPositiveNumber(value: unknown): number | null {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return null;
    }
    return parsed;
  }

  private resolveCustomerName(customer: ApiCustomer | null, fallback: ApiCustomer | null): string {
    const first = customer?.name ?? fallback?.name ?? '';
    const last = customer?.lastName ?? fallback?.lastName ?? '';
    const fullName = `${first} ${last}`.trim();
    return fullName || `Cliente #${customer?.id ?? fallback?.id ?? '?'}`;
  }

  private resolveCustomerEmail(customer: ApiCustomer | null, fallback: ApiCustomer | null): string {
    return customer?.user?.email ?? fallback?.user?.email ?? '-';
  }
}
