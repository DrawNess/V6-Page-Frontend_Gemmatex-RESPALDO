import { Component, computed, inject, OnDestroy, signal } from '@angular/core';
import { concatMap } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ApiOrder } from '@shared/models/user-portal.model';
import { OrderService } from '@shared/services/order.service';
import { StatusAlert, THRESHOLDS } from './orders-admin.constants';
import { getTotal, sortByPriorityThenDate, statusMeta } from './orders-admin.helpers';
import { OrdersCommandBarComponent } from './components/orders-command-bar/orders-command-bar.component';
import { OrdersMasterComponent } from './components/orders-master/orders-master.component';
import { OrdersDetailComponent } from './components/orders-detail/orders-detail.component';
import { OrdersStatusModalComponent } from './components/orders-status-modal/orders-status-modal.component';

@Component({
  selector: 'app-orders-admin',
  standalone: true,
  imports: [CommonModule, OrdersCommandBarComponent, OrdersMasterComponent, OrdersDetailComponent, OrdersStatusModalComponent],
  templateUrl: './orders-admin.component.html',
  styleUrl: './orders-admin.component.css',
})
export class OrdersAdminComponent implements OnDestroy {
  private orderService = inject(OrderService);
  private readonly pageSize = 100;
  private tickInterval: ReturnType<typeof setInterval>;

  readonly now     = signal(Date.now());
  readonly loading = signal(false);
  readonly saving  = signal(false);
  readonly toast   = signal<{ type: 'ok' | 'err' | 'warn'; msg: string } | null>(null);

  readonly orders    = signal<ApiOrder[]>([]);
  readonly allOrders = signal<ApiOrder[]>([]);

  readonly statusTab         = signal<string>('pendiente');
  readonly currentStatusParam = signal<string | undefined>('pendiente');
  readonly expandOrderId     = signal<number | null>(null);

  /** Pedido seleccionado en el panel de detalle */
  readonly selectedOrder = signal<ApiOrder | null>(null);

  /** Pedido abierto en el modal de cambio de estado */
  readonly modalOrder = signal<ApiOrder | null>(null);

  // ── Stats ──────────────────────────────────────────────
  readonly totalOrders    = computed(() => this.allOrders().length);
  readonly pendingCount   = computed(() => this.allOrders().filter(o => o.status === 'pendiente').length);
  readonly confirmedCount = computed(() => this.allOrders().filter(o => o.status === 'confirmado').length);
  readonly enCursoCount   = computed(() => this.allOrders().filter(o => o.status === 'en_curso').length);
  readonly shippedCount   = computed(() => this.allOrders().filter(o => o.status === 'enviado').length);
  readonly deliveredCount = computed(() => this.allOrders().filter(o => o.status === 'entregado').length);
  readonly cancelledCount = computed(() => this.allOrders().filter(o => o.status === 'cancelado').length);
  readonly grossTotal     = computed(() => this.allOrders().reduce((s, o) => s + getTotal(o), 0));

  readonly statusCounts = computed<Partial<Record<string, number>>>(() => {
    const counts: Record<string, number> = {};
    this.allOrders().forEach(o => {
      const k = o.status ?? 'desconocido';
      counts[k] = (counts[k] ?? 0) + 1;
    });
    return counts;
  });

  // ── Alertas ─────────────────────────────────────────────
  readonly alerts = computed<StatusAlert[]>(() => {
    const n = this.now();
    const all: StatusAlert[] = [];

    this.buildAlerts(all, 'pendiente', n, {
      warnLabel: 'Pedidos pendientes sin confirmar', warnMsg: 'Confirma estos pedidos antes de que el cliente pierda interés.',
      dangerLabel: 'Pedidos pendientes sin atender', dangerMsg: 'Atención INMEDIATA requerida. El cliente puede cancelar.',
      warnIcon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
      dangerIcon: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.832c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
      warnBorder: 'border-yellow-300', warnBg: 'bg-yellow-50', warnText: 'text-yellow-800', warnIconColor: 'text-yellow-600',
      dangerBorder: 'border-red-400',  dangerBg: 'bg-red-50',     dangerText: 'text-red-800',    dangerIconColor: 'text-red-600',
    });

    this.buildAlerts(all, 'confirmado', n, {
      warnLabel: 'Pedidos confirmados sin preparar', warnMsg: 'Confirmados pero aún no en curso. No los dejes esperando.',
      dangerLabel: 'Pedidos confirmados estancados',  dangerMsg: 'Demasiado tiempo confirmados sin avanzar.',
      warnIcon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      dangerIcon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
      warnBorder: 'border-blue-300', warnBg: 'bg-blue-50',  warnText: 'text-blue-800',  warnIconColor: 'text-blue-600',
      dangerBorder: 'border-blue-400', dangerBg: 'bg-blue-100', dangerText: 'text-blue-900', dangerIconColor: 'text-blue-700',
    });

    this.buildAlerts(all, 'en_curso', n, {
      warnLabel: 'Pedidos en preparación hace mucho', warnMsg: 'Más tiempo del normal en preparación.',
      dangerLabel: 'Pedidos en curso estancados',      dangerMsg: 'Más de 48h en preparación. Revisar urgente.',
      warnIcon: 'M13 10V3L4 14h7v7l9-11h-7z', dangerIcon: 'M13 10V3L4 14h7v7l9-11h-7z',
      warnBorder: 'border-indigo-300', warnBg: 'bg-indigo-50',  warnText: 'text-indigo-800',  warnIconColor: 'text-indigo-600',
      dangerBorder: 'border-indigo-400', dangerBg: 'bg-indigo-100', dangerText: 'text-indigo-900', dangerIconColor: 'text-indigo-700',
    });

    this.buildAlerts(all, 'enviado', n, {
      warnLabel: 'Envíos sin confirmar entrega', warnMsg: 'Enviados sin confirmación de entrega. Hacer seguimiento.',
      dangerLabel: 'Envíos pendientes de entrega', dangerMsg: 'Mucho tiempo enviados sin entregarse. Contactar cliente o courier.',
      warnIcon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
      dangerIcon: 'M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4',
      warnBorder: 'border-purple-300', warnBg: 'bg-purple-50',  warnText: 'text-purple-800',  warnIconColor: 'text-purple-600',
      dangerBorder: 'border-purple-400', dangerBg: 'bg-purple-100', dangerText: 'text-purple-900', dangerIconColor: 'text-purple-700',
    });

    const delivered24h = this.allOrders().filter(o =>
      o.status === 'entregado' && o.updatedAt && (n - new Date(o.updatedAt).getTime()) < 24 * 3_600_000
    );
    if (delivered24h.length > 0) {
      all.push({
        status: 'entregado', level: 'warn',
        label: `${delivered24h.length} pedido${delivered24h.length > 1 ? 's' : ''} entregado${delivered24h.length > 1 ? 's' : ''} en las últimas 24h`,
        message: 'Buen trabajo. Pedidos completados exitosamente.',
        icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
        borderColor: 'border-emerald-300', bgColor: 'bg-emerald-50', textColor: 'text-emerald-800',
        iconColor: 'text-emerald-600', pulse: false, orders: delivered24h,
      });
    }

    const cancelled48h = this.allOrders().filter(o =>
      o.status === 'cancelado' && o.updatedAt && (n - new Date(o.updatedAt).getTime()) < 48 * 3_600_000
    );
    if (cancelled48h.length > 0) {
      all.push({
        status: 'cancelado', level: 'warn',
        label: `${cancelled48h.length} pedido${cancelled48h.length > 1 ? 's' : ''} cancelado${cancelled48h.length > 1 ? 's' : ''} recientemente`,
        message: 'Revisa si hay patrones de cancelación.',
        icon: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
        borderColor: 'border-red-200', bgColor: 'bg-red-50/60', textColor: 'text-red-700',
        iconColor: 'text-red-500', pulse: false, orders: cancelled48h,
      });
    }

    return all;
  });

  readonly dangerAlertCount = computed(() => this.alerts().filter(a => a.pulse).length);

  constructor() {
    this.refreshAll();
    this.refresh();
    this.tickInterval = setInterval(() => this.now.set(Date.now()), 60_000);
  }

  ngOnDestroy() { clearInterval(this.tickInterval); }

  // ── Data loading ───────────────────────────────────────
  refreshAll(): void {
    this.orderService.getOrders({ page: 1, pageSize: this.pageSize }).subscribe({
      next: (orders) => this.allOrders.set(orders),
      error: () => {},
    });
  }

  refresh(status?: string): void {
    const statusParam = status ?? this.currentStatusParam();
    this.currentStatusParam.set(statusParam || undefined);
    this.loading.set(true);
    this.refreshAll();

    this.orderService.getOrders({ status: statusParam, page: 1, pageSize: this.pageSize }).subscribe({
      next: (orders) => {
        this.orders.set([...orders].sort(sortByPriorityThenDate));
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('err', 'No se pudieron cargar los pedidos.');
      },
    });
  }

  setTab(status: string): void {
    this.statusTab.set(status);
    this.expandOrderId.set(null);
    this.refresh(status === 'todos' ? undefined : status);
  }

  // ── Navigation from alert ──────────────────────────────
  goToOrder({ status, orderId }: { status: string; orderId: number }): void {
    this.statusTab.set(status);
    this.currentStatusParam.set(status);
    this.loading.set(true);
    this.refreshAll();

    this.orderService.getOrders({ status, page: 1, pageSize: this.pageSize }).subscribe({
      next: (orders) => {
        this.orders.set([...orders].sort(sortByPriorityThenDate));
        this.loading.set(false);
        this.expandOrderId.set(orderId);
        const found = this.orders().find(o => o.id === orderId);
        if (found) this.selectedOrder.set(found);
      },
      error: () => {
        this.loading.set(false);
        this.showToast('err', 'No se pudieron cargar los pedidos.');
      },
    });
  }

  // ── Modal ─────────────────────────────────────────────
  openModal(order: ApiOrder): void {
    this.modalOrder.set(order);
  }

  closeModal(): void {
    this.modalOrder.set(null);
  }

  saveStatus({ orderId, newStatus }: { orderId: number; newStatus: string }): void {
    const order = this.orders().find(o => o.id === orderId);
    if (!order) return;

    this.saving.set(true);

    // Optimistic update
    this.orders.update(list =>
      [...list.map(o => o.id === orderId ? { ...o, status: newStatus } : o)].sort(sortByPriorityThenDate)
    );

    this.orderService.updateOrderStatus(orderId, newStatus).pipe(
      concatMap(() => this.orderService.getOrderById(orderId))
    ).subscribe({
      next: (updated) => {
        this.orders.update(list =>
          [...list.map(o => o.id === updated.id ? updated : o)].sort(sortByPriorityThenDate)
        );
        this.allOrders.update(list => list.map(o => o.id === updated.id ? updated : o));
        if (this.selectedOrder()?.id === updated.id) this.selectedOrder.set(updated);
        const label = statusMeta(newStatus).label;
        this.showToast('ok', `Pedido #${orderId} → "${label}".`);
        this.saving.set(false);
        this.closeModal();
      },
      error: () => {
        // Rollback
        this.orders.update(list =>
          [...list.map(o => o.id === orderId ? { ...o, status: order.status } : o)].sort(sortByPriorityThenDate)
        );
        this.showToast('err', `No se pudo actualizar el pedido #${orderId}.`);
        this.saving.set(false);
      },
    });
  }

  private showToast(type: 'ok' | 'err' | 'warn', msg: string): void {
    this.toast.set({ type, msg });
    setTimeout(() => this.toast.set(null), 4000);
  }

  private buildAlerts(
    out: StatusAlert[], status: string, now: number,
    cfg: {
      warnLabel: string; warnMsg: string; dangerLabel: string; dangerMsg: string;
      warnIcon: string; dangerIcon: string;
      warnBorder: string; warnBg: string; warnText: string; warnIconColor: string;
      dangerBorder: string; dangerBg: string; dangerText: string; dangerIconColor: string;
    }
  ): void {
    const th = THRESHOLDS[status];
    if (!th) return;
    const getTime = (o: ApiOrder) => new Date(o.updatedAt ?? o.createdAt ?? 0).getTime();
    const warnCutoff   = now - th.warn   * 3_600_000;
    const dangerCutoff = now - th.danger * 3_600_000;
    const dangerOrders = this.allOrders().filter(o => o.status === status && getTime(o) < dangerCutoff);
    const warnOrders   = this.allOrders().filter(o => o.status === status && getTime(o) < warnCutoff && getTime(o) >= dangerCutoff);
    if (dangerOrders.length > 0) out.push({ status, level: 'danger', label: cfg.dangerLabel + ` (${dangerOrders.length})`, message: cfg.dangerMsg, icon: cfg.dangerIcon, borderColor: cfg.dangerBorder, bgColor: cfg.dangerBg, textColor: cfg.dangerText, iconColor: cfg.dangerIconColor, pulse: true, orders: dangerOrders });
    if (warnOrders.length > 0)   out.push({ status, level: 'warn',   label: cfg.warnLabel   + ` (${warnOrders.length})`,   message: cfg.warnMsg,   icon: cfg.warnIcon,   borderColor: cfg.warnBorder,   bgColor: cfg.warnBg,   textColor: cfg.warnText,   iconColor: cfg.warnIconColor,   pulse: false, orders: warnOrders });
  }
}
