import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiOrder, ApiOrderItem } from '@shared/models/user-portal.model';
import { OrderService } from '@shared/services/order.service';

/**
 * Tras la integración con SSO el cliente se identifica por `customerUuid` (UUID v7).
 * Mantengo el nombre del campo `customerId` en el summary por compatibilidad con el
 * template, pero su tipo cambia a `string` y se rellena desde `order.customerUuid`.
 */
type CustomerOrdersSummary = {
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  ordersCount: number;
  totalSpent: number;
  lastOrderAt: string | null;
};

const STATUS_PRIORITY: Record<string, number> = {
  pendiente: 0,
  confirmado: 1,
  en_curso: 2,
  enviado: 3,
  entregado: 4,
  cancelado: 5,
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
  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  readonly backMenuUrl  = `${this.adminBase}/${ROUTE_CONSTANTS.ADMIN.MENU}`;
  readonly usersAdminUrl = `${this.adminBase}/${ROUTE_CONSTANTS.ADMIN.USERS}`;

  readonly loading  = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');

  readonly orders = signal<ApiOrder[]>([]);
  readonly selectedCustomerId = signal<string | null>(null);
  readonly selectedOrderId    = signal<number | null>(null);
  readonly searchText         = signal('');

  readonly customersWithOrdersCount = computed(() => this.summaries().length);
  readonly totalOrdersCount = computed(() => this.orders().length);
  readonly grossTotal = computed(() =>
    this.orders().reduce((acc, order) => acc + this.getOrderTotal(order), 0)
  );
  readonly statusCounts = computed<Partial<Record<string, number>>>(() => {
    const map: Record<string, number> = {};
    this.orders().forEach(o => {
      const k = o.status ?? 'desconocido';
      map[k] = (map[k] ?? 0) + 1;
    });
    return map;
  });

  readonly summaries = computed<CustomerOrdersSummary[]>(() => {
    const grouped = new Map<string, ApiOrder[]>();

    for (const order of this.orders()) {
      const customerId = this.getOrderCustomerId(order);
      if (!customerId) continue;
      const list = grouped.get(customerId) ?? [];
      list.push(order);
      grouped.set(customerId, list);
    }

    const summaries: CustomerOrdersSummary[] = [];
    for (const [customerId, orders] of grouped.entries()) {
      // Snapshot del cliente vive en cualquier orden del grupo (campos planos
      // tras la integración SSO). Fallback al `order.customer` legacy si aún
      // queda alguna respuesta vieja.
      const ref = orders.find((o) => (o as any).customerName) ?? orders[0];
      const snapshotName = (ref as { customerName?: string }).customerName;
      const snapshotEmail = (ref as { customerEmail?: string }).customerEmail;
      const snapshotPhone = (ref as { customerPhone?: string }).customerPhone;
      const embedded = ref.customer;

      const name =
        (snapshotName?.trim() ||
          (embedded ? `${embedded.name ?? ''} ${embedded.lastName ?? ''}`.trim() : '')) ||
        'Cliente sin nombre';
      const email = snapshotEmail ?? embedded?.user?.email ?? '-';
      const phone = snapshotPhone ?? embedded?.phone ?? '-';

      summaries.push({
        customerId,
        customerName: name,
        customerEmail: email,
        customerPhone: phone,
        ordersCount: orders.length,
        totalSpent: orders.reduce((acc, o) => acc + this.getOrderTotal(o), 0),
        lastOrderAt: orders
          .map(o => o.createdAt)
          .filter((v): v is string => !!v)
          .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? null,
      });
    }

    return summaries.sort((a, b) => b.totalSpent - a.totalSpent);
  });

  readonly filteredSummaries = computed(() => {
    const term = this.searchText().trim().toLowerCase();
    if (!term) return this.summaries();
    return this.summaries().filter(s =>
      s.customerId.toLowerCase().includes(term) ||
      s.customerName.toLowerCase().includes(term) ||
      s.customerEmail.toLowerCase().includes(term) ||
      s.customerPhone.toLowerCase().includes(term)
    );
  });

  readonly selectedSummary = computed(() => {
    const id = this.selectedCustomerId();
    return id ? (this.summaries().find(s => s.customerId === id) ?? null) : null;
  });

  readonly selectedCustomerOrders = computed(() => {
    const id = this.selectedCustomerId();
    if (!id) return [];
    return this.orders()
      .filter(o => this.getOrderCustomerId(o) === id)
      .sort((a, b) => {
        const pa = STATUS_PRIORITY[a.status ?? ''] ?? 99;
        const pb = STATUS_PRIORITY[b.status ?? ''] ?? 99;
        if (pa !== pb) return pa - pb;
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
  });

  readonly selectedOrder = computed(() => {
    const id = this.selectedOrderId();
    return id ? (this.selectedCustomerOrders().find(o => o.id === id) ?? null) : null;
  });

  constructor() { this.refresh(); }

  refresh(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.orderService.getOrders().subscribe({
      next: (orders) => {
        this.orders.set(orders);
        this.loading.set(false);
        this.successMsg.set('Panel de pedidos actualizado.');

        if (!this.selectedCustomerId() && this.summaries().length > 0) {
          this.selectCustomer(this.summaries()[0].customerId);
        }
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('No se pudieron cargar los pedidos. Verifica que el servidor esté activo.');
      },
    });
  }

  selectCustomer(customerId: string): void {
    this.selectedCustomerId.set(customerId);
    this.selectedOrderId.set(this.selectedCustomerOrders()[0]?.id ?? null);
  }

  selectOrder(orderId: number): void {
    this.selectedOrderId.set(orderId);
  }

  getOrderItems(order: ApiOrder | null): ApiOrderItem[] {
    const raw = order?.items;
    return Array.isArray(raw) ? raw : [];
  }

  getOrderTotal(order: ApiOrder | null): number {
    if (!order) return 0;
    if (typeof order.total === 'number') return order.total;
    return this.getOrderItems(order).reduce((sum, item) => {
      return sum + this.getItemSubtotal(item);
    }, 0);
  }

  getItemAmount(item: ApiOrderItem): number {
    return Number(item.amount ?? (item as any)?.['OrderProduct']?.amount ?? 0);
  }

  getItemName(item: ApiOrderItem): string {
    return String(item.name ?? item.sku ?? `Variante #${item.variantId ?? '-'}`);
  }

  getItemSubtotal(item: ApiOrderItem): number {
    return this.getItemAmount(item) * Number(item.OrderProduct?.unitPrice ?? item.price ?? 0);
  }

  readonly STATUS_META: Record<string, { label: string; color: string }> = {
    pendiente:  { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
    confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-300' },
    en_curso:   { label: 'En curso',   color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    enviado:    { label: 'Enviado',    color: 'bg-purple-100 text-purple-800 border-purple-300' },
    entregado:  { label: 'Entregado',  color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    cancelado:  { label: 'Cancelado',  color: 'bg-red-100 text-red-800 border-red-300' },
  };

  statusMeta(status?: string | null): { label: string; color: string } {
    return this.STATUS_META[status ?? ''] ?? { label: status ?? '—', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  }

  /**
   * Devuelve el identificador del cliente para agrupación de órdenes.
   * Tras la integración con SSO la fuente es `customerUuid` (UUID v7).
   * Fallback al `customerId` legacy convertido a string sólo si no hay UUID.
   */
  private getOrderCustomerId(order: ApiOrder): string | null {
    const uuid = (order as { customerUuid?: string }).customerUuid;
    if (uuid && uuid.trim()) return uuid;
    if (order.customerId !== undefined && order.customerId !== null) {
      return String(order.customerId);
    }
    return null;
  }
}
