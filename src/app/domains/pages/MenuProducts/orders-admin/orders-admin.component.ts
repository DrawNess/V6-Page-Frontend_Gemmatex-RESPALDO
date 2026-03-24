import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiOrder, ApiOrderItem } from '@shared/models/user-portal.model';
import { OrderService } from '@shared/services/order.service';

export const ORDER_STATUSES = [
  { value: 'pendiente',  label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  { value: 'en_curso',   label: 'En curso',   color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  { value: 'enviado',    label: 'Enviado',    color: 'bg-purple-100 text-purple-800 border-purple-300' },
  { value: 'entregado',  label: 'Entregado',  color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  { value: 'cancelado',  label: 'Cancelado',  color: 'bg-red-100 text-red-800 border-red-300' },
] as const;

@Component({
  selector: 'app-orders-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders-admin.component.html',
})
export class OrdersAdminComponent {
  private orderService = inject(OrderService);

  readonly statuses = ORDER_STATUSES;

  readonly loading    = signal(false);
  readonly saving     = signal<number | null>(null);
  readonly errorMsg   = signal('');
  readonly successMsg = signal('');

  readonly orders = signal<ApiOrder[]>([]);

  readonly searchText   = signal('');
  readonly filterStatus = signal('');
  readonly expandedId   = signal<number | null>(null);
  readonly editingStatus = signal<Record<number, string>>({});

  // Stats
  readonly totalOrders  = computed(() => this.orders().length);
  readonly pendingCount = computed(() => this.orders().filter(o => o.status === 'pendiente').length);
  readonly shippedCount = computed(() => this.orders().filter(o => o.status === 'enviado').length);
  readonly grossTotal   = computed(() =>
    this.orders().reduce((s, o) => s + this.getTotal(o), 0)
  );

  readonly filtered = computed(() => {
    const q      = this.searchText().trim().toLowerCase();
    const status = this.filterStatus();

    return this.orders().filter(o => {
      const matchStatus = !status || o.status === status;
      if (!q) return matchStatus;

      const name = this.getCustomerName(o).toLowerCase();
      const matchQ =
        String(o.id).includes(q) ||
        name.includes(q) ||
        (o.status ?? '').toLowerCase().includes(q);

      return matchStatus && matchQ;
    });
  });

  constructor() { this.refresh(); }

  refresh(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.successMsg.set('');

    this.orderService.getOrders().subscribe({
      next: (orders) => {
        const sorted = [...orders].sort((a, b) => {
          const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bt - at;
        });
        this.orders.set(sorted);

        // init editing map
        const map: Record<number, string> = {};
        sorted.forEach(o => { map[o.id] = o.status ?? 'pendiente'; });
        this.editingStatus.set(map);

        this.loading.set(false);
        this.successMsg.set(`${sorted.length} pedidos cargados.`);
      },
      error: () => {
        this.loading.set(false);
        this.errorMsg.set('No se pudieron cargar los pedidos. Verifica que el servidor esté activo y que tu sesión sea válida.');
      },
    });
  }

  toggleExpand(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  setStatusEdit(orderId: number, value: string): void {
    this.editingStatus.update(map => ({ ...map, [orderId]: value }));
  }

  saveStatus(order: ApiOrder): void {
    const newStatus = this.editingStatus()[order.id];
    if (!newStatus || newStatus === order.status) return;

    this.saving.set(order.id);
    this.errorMsg.set('');
    this.successMsg.set('');

    // optimistic update
    this.orders.update(list =>
      list.map(o => o.id === order.id ? { ...o, status: newStatus } : o)
    );

    this.orderService.updateOrderStatus(order.id, newStatus).subscribe({
      next: (updated) => {
        this.orders.update(list =>
          list.map(o => o.id === updated.id ? updated : o)
        );
        this.successMsg.set(`Pedido #${order.id} → ${newStatus}.`);
        this.saving.set(null);
      },
      error: () => {
        // rollback
        this.orders.update(list =>
          list.map(o => o.id === order.id ? { ...o, status: order.status } : o)
        );
        this.editingStatus.update(map => ({ ...map, [order.id]: order.status ?? 'pendiente' }));
        this.errorMsg.set(`No se pudo actualizar el pedido #${order.id}.`);
        this.saving.set(null);
      },
    });
  }

  // ── helpers ─────────────────────────────────────────
  getTotal(order: ApiOrder | null): number {
    if (!order) return 0;
    if (typeof order.total === 'number') return order.total;
    return this.getItems(order).reduce((s, item) => {
      const amount = Number(item.amount ?? (item as any)?.['OrderProduct']?.amount ?? 0);
      return s + amount * Number(item.price ?? 0);
    }, 0);
  }

  getItems(order: ApiOrder | null): ApiOrderItem[] {
    return Array.isArray(order?.items) ? order!.items! : [];
  }

  getItemAmount(item: ApiOrderItem): number {
    return Number(item.amount ?? (item as any)?.['OrderProduct']?.amount ?? 0);
  }

  getItemName(item: ApiOrderItem): string {
    return String(item.name ?? item.sku ?? `Variante #${item.variantId ?? '-'}`);
  }

  getCustomerName(order: ApiOrder): string {
    if (order.customer) {
      const { name = '', lastName = '' } = order.customer;
      const full = `${name} ${lastName}`.trim();
      return full || `#${order.customer.id}`;
    }
    return `Cliente #${order.customerId ?? '?'}`;
  }

  statusMeta(value?: string | null) {
    return this.statuses.find(s => s.value === value)
      ?? { value: value ?? '?', label: value ?? 'Desconocido', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  }

  trackById = (_: number, o: ApiOrder) => o.id;
}
