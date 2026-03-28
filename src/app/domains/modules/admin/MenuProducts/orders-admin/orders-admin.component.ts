import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiOrder, ApiOrderItem } from '@shared/models/user-portal.model';
import { OrderService } from '@shared/services/order.service';

export const ORDER_STATUSES = [
  { value: 'pendiente',  label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-800 border-yellow-300', dot: 'bg-yellow-500' },
  { value: 'confirmado', label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-300',       dot: 'bg-blue-500' },
  { value: 'en_curso',   label: 'En curso',   color: 'bg-indigo-100 text-indigo-800 border-indigo-300', dot: 'bg-indigo-500' },
  { value: 'enviado',    label: 'Enviado',    color: 'bg-purple-100 text-purple-800 border-purple-300', dot: 'bg-purple-500' },
  { value: 'entregado',  label: 'Entregado',  color: 'bg-emerald-100 text-emerald-800 border-emerald-300', dot: 'bg-emerald-500' },
  { value: 'cancelado',  label: 'Cancelado',  color: 'bg-red-100 text-red-800 border-red-300',         dot: 'bg-red-500' },
] as const;

const STATUS_PRIORITY: Record<string, number> = {
  pendiente: 0, confirmado: 1, en_curso: 2, enviado: 3, entregado: 4, cancelado: 5,
};

// ── Umbrales de alerta por estado (horas) ──────────────────
// Cada estado tiene un warn y un danger. Si el pedido lleva
// más de X horas en ese estado, se dispara la alerta.
const THRESHOLDS: Record<string, { warn: number; danger: number }> = {
  pendiente:  { warn: 12,  danger: 24 },   // Sin confirmar
  confirmado: { warn: 6,   danger: 12 },   // Confirmado pero sin preparar
  en_curso:   { warn: 24,  danger: 48 },   // En preparación demasiado tiempo
  enviado:    { warn: 48,  danger: 96 },   // Enviado pero sin entregar
};

export interface StatusAlert {
  status: string;
  level: 'warn' | 'danger';
  label: string;
  message: string;
  icon: string;          // SVG path
  borderColor: string;
  bgColor: string;
  textColor: string;
  iconColor: string;
  pulse: boolean;
  orders: ApiOrder[];
}

@Component({
  selector: 'app-orders-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders-admin.component.html',
  styleUrl: './orders-admin.component.css',
})
export class OrdersAdminComponent implements OnDestroy {
  private orderService = inject(OrderService);
  private readonly defaultPageSize = 100;
  private tickInterval: ReturnType<typeof setInterval>;

  readonly statuses = ORDER_STATUSES;
  readonly now = signal(Date.now());

  readonly loading    = signal(false);
  readonly saving     = signal<number | null>(null);
  readonly toast      = signal<{ type: 'ok' | 'err' | 'warn'; msg: string } | null>(null);
  readonly alertsCollapsed = signal(false);

  /** Pedidos del tab activo (filtrado por estado en el API) */
  readonly orders = signal<ApiOrder[]>([]);
  /** TODOS los pedidos — se usa para alertas y stats globales */
  readonly allOrders = signal<ApiOrder[]>([]);

  readonly searchText   = signal('');
  readonly filterStatus = signal('');
  readonly statusTab    = signal<'todos' | typeof ORDER_STATUSES[number]['value']>('pendiente');
  readonly expandedId   = signal<number | null>(null);
  readonly editingStatus = signal<Record<number, string>>({});
  readonly currentStatusParam = signal<string | undefined>('pendiente');

  // ── Stats (siempre sobre allOrders) ────────────────────
  readonly totalOrders    = computed(() => this.allOrders().length);
  readonly pendingCount   = computed(() => this.allOrders().filter(o => o.status === 'pendiente').length);
  readonly confirmedCount = computed(() => this.allOrders().filter(o => o.status === 'confirmado').length);
  readonly enCursoCount   = computed(() => this.allOrders().filter(o => o.status === 'en_curso').length);
  readonly shippedCount   = computed(() => this.allOrders().filter(o => o.status === 'enviado').length);
  readonly deliveredCount = computed(() => this.allOrders().filter(o => o.status === 'entregado').length);
  readonly cancelledCount = computed(() => this.allOrders().filter(o => o.status === 'cancelado').length);
  readonly grossTotal     = computed(() =>
    this.allOrders().reduce((s, o) => s + this.getTotal(o), 0)
  );

  readonly statusCounts = computed<Partial<Record<string, number>>>(() => {
    const counts: Record<string, number> = {};
    this.allOrders().forEach(o => {
      const k = o.status ?? 'desconocido';
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return counts;
  });

  // ── Alertas multi-estado ───────────────────────────────
  readonly alerts = computed<StatusAlert[]>(() => {
    const n = this.now();
    const all: StatusAlert[] = [];

    // Pendientes
    this.buildAlerts(all, 'pendiente', n, {
      warnLabel: 'Pedidos pendientes sin confirmar',
      warnMsg: 'Confirma estos pedidos antes de que el cliente pierda interés.',
      dangerLabel: 'Pedidos pendientes sin atender',
      dangerMsg: 'Estos pedidos necesitan atención INMEDIATA. El cliente puede cancelar.',
      warnIcon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      dangerIcon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
      warnBorder: 'border-yellow-300', warnBg: 'bg-yellow-50', warnText: 'text-yellow-800', warnIconColor: 'text-yellow-600',
      dangerBorder: 'border-red-400', dangerBg: 'bg-red-50', dangerText: 'text-red-800', dangerIconColor: 'text-red-600',
    });

    // Confirmados
    this.buildAlerts(all, 'confirmado', n, {
      warnLabel: 'Pedidos confirmados sin preparar',
      warnMsg: 'Ya se confirmaron pero aún no pasaron a "En curso". No los dejes esperando.',
      dangerLabel: 'Pedidos confirmados estancados',
      dangerMsg: 'Llevan demasiado tiempo confirmados sin avanzar. El cliente espera novedades.',
      warnIcon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      dangerIcon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      warnBorder: 'border-blue-300', warnBg: 'bg-blue-50', warnText: 'text-blue-800', warnIconColor: 'text-blue-600',
      dangerBorder: 'border-blue-400', dangerBg: 'bg-blue-100', dangerText: 'text-blue-900', dangerIconColor: 'text-blue-700',
    });

    // En curso
    this.buildAlerts(all, 'en_curso', n, {
      warnLabel: 'Pedidos en preparación hace mucho',
      warnMsg: 'Están en curso pero tardan más de lo normal. Verifica si hay algún problema.',
      dangerLabel: 'Pedidos en curso estancados',
      dangerMsg: 'Llevan más de 48h en preparación. Revisa urgentemente.',
      warnIcon: 'M13 10V3L4 14h7v7l9-11h-7z',
      dangerIcon: 'M13 10V3L4 14h7v7l9-11h-7z',
      warnBorder: 'border-indigo-300', warnBg: 'bg-indigo-50', warnText: 'text-indigo-800', warnIconColor: 'text-indigo-600',
      dangerBorder: 'border-indigo-400', dangerBg: 'bg-indigo-100', dangerText: 'text-indigo-900', dangerIconColor: 'text-indigo-700',
    });

    // Enviados
    this.buildAlerts(all, 'enviado', n, {
      warnLabel: 'Envíos sin confirmar entrega',
      warnMsg: 'Ya se enviaron pero no hay confirmación de entrega. Haz seguimiento con el cliente.',
      dangerLabel: 'Envíos pendientes de entrega',
      dangerMsg: 'Llevan mucho tiempo enviados sin entregarse. Contacta al cliente o al courier.',
      warnIcon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
      dangerIcon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
      warnBorder: 'border-purple-300', warnBg: 'bg-purple-50', warnText: 'text-purple-800', warnIconColor: 'text-purple-600',
      dangerBorder: 'border-purple-400', dangerBg: 'bg-purple-100', dangerText: 'text-purple-900', dangerIconColor: 'text-purple-700',
    });

    // Entregados recientes (últimas 24h) — alerta positiva
    const delivered24h = this.allOrders().filter(o =>
      o.status === 'entregado' && o.updatedAt &&
      (n - new Date(o.updatedAt).getTime()) < 24 * 3600_000
    );
    if (delivered24h.length > 0) {
      all.push({
        status: 'entregado', level: 'warn', // reuse warn for "info"
        label: `${delivered24h.length} pedido${delivered24h.length > 1 ? 's' : ''} entregado${delivered24h.length > 1 ? 's' : ''} en las últimas 24h`,
        message: 'Buen trabajo. Estos pedidos fueron completados exitosamente.',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        borderColor: 'border-emerald-300', bgColor: 'bg-emerald-50', textColor: 'text-emerald-800',
        iconColor: 'text-emerald-600', pulse: false, orders: delivered24h,
      });
    }

    // Cancelados recientes (últimas 48h) — alerta informativa
    const cancelled48h = this.allOrders().filter(o =>
      o.status === 'cancelado' && o.updatedAt &&
      (n - new Date(o.updatedAt).getTime()) < 48 * 3600_000
    );
    if (cancelled48h.length > 0) {
      all.push({
        status: 'cancelado', level: 'warn',
        label: `${cancelled48h.length} pedido${cancelled48h.length > 1 ? 's' : ''} cancelado${cancelled48h.length > 1 ? 's' : ''} recientemente`,
        message: 'Revisa si hay patrones de cancelación para mejorar el servicio.',
        icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
        borderColor: 'border-red-200', bgColor: 'bg-red-50/60', textColor: 'text-red-700',
        iconColor: 'text-red-500', pulse: false, orders: cancelled48h,
      });
    }

    return all;
  });

  readonly alertCount = computed(() => this.alerts().length);
  readonly dangerAlertCount = computed(() => this.alerts().filter(a => a.pulse).length);

  readonly filtered = computed(() => {
    const q      = this.searchText().trim().toLowerCase();
    const status = this.statusTab() !== 'todos' ? this.statusTab() : this.filterStatus();

    return [...this.orders()].filter(o => {
      const matchStatus = !status || o.status === status;
      if (!q) return matchStatus;

      const name = this.getCustomerName(o).toLowerCase();
      const matchQ =
        String(o.id).includes(q) ||
        name.includes(q) ||
        (o.status ?? '').toLowerCase().includes(q);

      return matchStatus && matchQ;
    }).sort(this.sortByPriorityThenDate);
  });

  constructor() {
    this.refreshAll();
    this.refresh();
    this.tickInterval = setInterval(() => this.now.set(Date.now()), 60_000);
  }

  ngOnDestroy() {
    clearInterval(this.tickInterval);
  }

  // ── Alert builder ──────────────────────────────────────
  private buildAlerts(
    out: StatusAlert[],
    status: string,
    now: number,
    cfg: {
      warnLabel: string; warnMsg: string; dangerLabel: string; dangerMsg: string;
      warnIcon: string; dangerIcon: string;
      warnBorder: string; warnBg: string; warnText: string; warnIconColor: string;
      dangerBorder: string; dangerBg: string; dangerText: string; dangerIconColor: string;
    }
  ) {
    const th = THRESHOLDS[status];
    if (!th) return;

    const warnCutoff   = now - th.warn * 3600_000;
    const dangerCutoff = now - th.danger * 3600_000;

    // Use updatedAt if available (time in current status), fallback to createdAt
    const getTime = (o: ApiOrder) => new Date(o.updatedAt ?? o.createdAt ?? 0).getTime();

    const dangerOrders = this.allOrders().filter(o =>
      o.status === status && getTime(o) < dangerCutoff
    );
    const warnOrders = this.allOrders().filter(o =>
      o.status === status && getTime(o) < warnCutoff && getTime(o) >= dangerCutoff
    );

    if (dangerOrders.length > 0) {
      out.push({
        status, level: 'danger',
        label: cfg.dangerLabel + ` (${dangerOrders.length})`,
        message: cfg.dangerMsg, icon: cfg.dangerIcon,
        borderColor: cfg.dangerBorder, bgColor: cfg.dangerBg,
        textColor: cfg.dangerText, iconColor: cfg.dangerIconColor,
        pulse: true, orders: dangerOrders,
      });
    }
    if (warnOrders.length > 0) {
      out.push({
        status, level: 'warn',
        label: cfg.warnLabel + ` (${warnOrders.length})`,
        message: cfg.warnMsg, icon: cfg.warnIcon,
        borderColor: cfg.warnBorder, bgColor: cfg.warnBg,
        textColor: cfg.warnText, iconColor: cfg.warnIconColor,
        pulse: false, orders: warnOrders,
      });
    }
  }

  // ── Actions ────────────────────────────────────────────

  /** Carga TODOS los pedidos (sin filtro) para alertas y stats */
  refreshAll(): void {
    this.orderService.getOrders({ page: 1, pageSize: this.defaultPageSize }).subscribe({
      next: (orders) => this.allOrders.set(orders),
      error: () => {}, // silencioso, las alertas simplemente no muestran
    });
  }

  refresh(status?: string): void {
    const statusParam = status ?? this.currentStatusParam();
    this.currentStatusParam.set(statusParam || undefined);
    this.loading.set(true);

    // Siempre refrescar allOrders para alertas/stats globales
    this.refreshAll();

    this.orderService.getOrders({
      status: statusParam,
      page: 1,
      pageSize: this.defaultPageSize
    }).subscribe({
      next: (orders) => {
        const sorted = [...orders].sort(this.sortByPriorityThenDate);
        this.orders.set(sorted);

        const map: Record<number, string> = {};
        sorted.forEach(o => { map[o.id] = o.status ?? 'pendiente'; });
        this.editingStatus.set(map);

        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('err', 'No se pudieron cargar los pedidos. Verifica tu conexión.');
      },
    });
  }

  toggleExpand(id: number): void {
    this.expandedId.set(this.expandedId() === id ? null : id);
  }

  setTab(status: 'todos' | typeof ORDER_STATUSES[number]['value']) {
    this.statusTab.set(status);
    this.filterStatus.set(status === 'todos' ? '' : status);
    this.refresh(status === 'todos' ? undefined : status);
  }

  /** Navega desde una alerta: cambia tab y expande el pedido al cargar */
  goToOrder(status: string, orderId: number): void {
    this.statusTab.set(status as any);
    this.filterStatus.set(status);
    this.currentStatusParam.set(status);
    this.loading.set(true);
    this.refreshAll();

    this.orderService.getOrders({ status, page: 1, pageSize: this.defaultPageSize }).subscribe({
      next: (orders) => {
        const sorted = [...orders].sort(this.sortByPriorityThenDate);
        this.orders.set(sorted);
        const map: Record<number, string> = {};
        sorted.forEach(o => { map[o.id] = o.status ?? 'pendiente'; });
        this.editingStatus.set(map);
        this.loading.set(false);
        // Expandir el pedido después de cargar
        this.expandedId.set(orderId);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('err', 'No se pudieron cargar los pedidos.');
      },
    });
  }

  setStatusEdit(orderId: number, value: string): void {
    this.editingStatus.update(map => ({ ...map, [orderId]: value }));
  }

  saveStatus(order: ApiOrder): void {
    const newStatus = this.editingStatus()[order.id];
    if (!newStatus || newStatus === order.status) return;

    this.saving.set(order.id);

    this.orders.update(list =>
      [...list.map(o => o.id === order.id ? { ...o, status: newStatus } : o)].sort(this.sortByPriorityThenDate)
    );

    this.orderService.updateOrderStatus(order.id, newStatus).subscribe({
      next: (updated) => {
        this.orders.update(list =>
          [...list.map(o => o.id === updated.id ? updated : o)].sort(this.sortByPriorityThenDate)
        );
        // Actualizar allOrders también para que las alertas reflejen el cambio
        this.allOrders.update(list =>
          [...list.map(o => o.id === updated.id ? updated : o)]
        );
        const label = this.statusMeta(newStatus).label;
        this.showToast('ok', `Pedido #${order.id} → "${label}".`);
        this.saving.set(null);
      },
      error: () => {
        this.orders.update(list =>
          [...list.map(o => o.id === order.id ? { ...o, status: order.status } : o)].sort(this.sortByPriorityThenDate)
        );
        this.editingStatus.update(map => ({ ...map, [order.id]: order.status ?? 'pendiente' }));
        this.showToast('err', `No se pudo actualizar el pedido #${order.id}.`);
        this.saving.set(null);
      },
    });
  }

  // ── Time helpers ─────────────────────────────────────
  timeAgo(dateStr?: string): string {
    if (!dateStr) return '—';
    const diff = this.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return 'ahora';
    if (mins < 60) return `hace ${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    return `hace ${days}d`;
  }

  hoursElapsed(dateStr?: string): number {
    if (!dateStr) return 0;
    return (this.now() - new Date(dateStr).getTime()) / 3600_000;
  }

  /** Row urgency based on how long the order has been in its current status */
  rowUrgency(order: ApiOrder): 'danger' | 'warn' | 'normal' {
    const th = THRESHOLDS[order.status ?? ''];
    if (!th) return 'normal';
    const h = this.hoursElapsed(order.updatedAt ?? order.createdAt);
    if (h >= th.danger) return 'danger';
    if (h >= th.warn) return 'warn';
    return 'normal';
  }

  // ── Data helpers ─────────────────────────────────────
  getTotal(order: ApiOrder | null): number {
    if (!order) return 0;
    if (typeof order.total === 'number') return order.total;
    return this.getItems(order).reduce((s, item) =>
      s + this.getItemAmount(item) * this.getItemPrice(item), 0
    );
  }

  getItems(order: ApiOrder | null): ApiOrderItem[] {
    return Array.isArray(order?.items) ? order!.items! : [];
  }

  getItemAmount(item: ApiOrderItem): number {
    return Number(item.OrderProduct?.amount ?? item.amount ?? 0);
  }

  getItemVariantId(item: ApiOrderItem): number | null {
    return item.OrderProduct?.variantId ?? item.variantId ?? null;
  }

  getItemName(item: ApiOrderItem): string {
    return String(item.name ?? item.sku ?? `Variante #${this.getItemVariantId(item) ?? '-'}`);
  }

  getItemDescription(item: ApiOrderItem): string | null {
    return item.description ?? item.shortDescription ?? null;
  }

  getItemPrice(item: ApiOrderItem): number {
    return Number(item.price ?? 0);
  }

  getCustomerName(order: ApiOrder): string {
    if (order.customer) {
      const { name = '', lastName = '' } = order.customer;
      const full = `${name} ${lastName}`.trim();
      return full || `#${order.customer.id}`;
    }
    return `Cliente #${order.customerId ?? '?'}`;
  }

  getCustomerPhone(order: ApiOrder): string | null {
    return order.customer?.phone ?? null;
  }

  getCustomerLocation(order: ApiOrder): string | null {
    const c = order.customer;
    if (!c) return null;
    const parts = [c.city, c.region, c.street, c.streetNumber].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  }

  statusMeta(value?: string | null) {
    return this.statuses.find(s => s.value === value)
      ?? { value: value ?? '?', label: value ?? 'Desconocido', color: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-500' };
  }

  private showToast(type: 'ok' | 'err' | 'warn', msg: string) {
    this.toast.set({ type, msg });
    setTimeout(() => this.toast.set(null), 4000);
  }

  private sortByPriorityThenDate = (a: ApiOrder, b: ApiOrder): number => {
    const pa = STATUS_PRIORITY[a.status ?? ''] ?? 99;
    const pb = STATUS_PRIORITY[b.status ?? ''] ?? 99;
    if (pa !== pb) return pa - pb;
    const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bt - at;
  };

  trackById = (_: number, o: ApiOrder) => o.id;
}
