import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiCustomer, ApiOrder, ApiOrderItem } from '@shared/models/user-portal.model';
import { CustomerService } from '@shared/services/customer.service';
import { ProfileService } from '@shared/services/profile.service';

interface OrderDetailCache {
  loading: boolean;
  items: ApiOrderItem[];
  fetched: boolean;
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  pendiente:  { label: 'Pendiente',  color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  confirmado: { label: 'Confirmado', color: 'bg-blue-100 text-blue-800 border-blue-300' },
  en_curso:   { label: 'En curso',   color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
  enviado:    { label: 'Enviado',    color: 'bg-purple-100 text-purple-800 border-purple-300' },
  entregado:  { label: 'Entregado',  color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  cancelado:  { label: 'Cancelado',  color: 'bg-red-100 text-red-800 border-red-300' },
};

const STATUS_STEPS = ['pendiente', 'confirmado', 'en_curso', 'enviado', 'entregado'];

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
  selectedOrderId: number | null = null;
  selectedOrder: ApiOrder | null = null;
  detailCache = new Map<number, OrderDetailCache>();

  constructor(
    private readonly profileService: ProfileService,
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

    // Backend filtra cancelados por defecto: traemos lista general + cancelados aparte y mergeamos.
    // Cap en 100 (max permitido por listOrdersSchema del API-V6).
    forkJoin({
      all: this.profileService.getMyOrders({ pageSize: 100 }),
      cancelled: this.profileService.getMyOrders({ status: 'cancelado', pageSize: 100 }).pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ all, cancelled }) => {
        const map = new Map<number, ApiOrder>();
        for (const o of [...(all ?? []), ...(cancelled ?? [])]) {
          if (o?.id != null) map.set(o.id, o);
        }
        this.orders = [...map.values()].sort((a, b) => {
          const aTime = new Date(a.createdAt ?? 0).getTime();
          const bTime = new Date(b.createdAt ?? 0).getTime();
          return bTime - aTime;
        });
        this.loading = false;
        this.selectFirst();
      },
      error: (err) => {
        this.loading = false;
        console.error('[Orders] Error al cargar pedidos:', err);
        if (err?.status === 401) {
          this.errorMsg = 'Tu sesión expiró. Vuelve a iniciar sesión.';
        } else if (err?.status === 403) {
          this.errorMsg = 'No tienes permiso para ver pedidos.';
        } else {
          this.errorMsg = `No se pudieron cargar tus pedidos (${err?.status ?? 'error de red'}). Intenta nuevamente.`;
        }
      },
    });
  }

  trackByOrder(_: number, order: ApiOrder): number {
    return order.id;
  }

  toggleDetail(order: ApiOrder): void {
    if (this.selectedOrderId === order.id) {
      this.selectedOrder = null;
      this.selectedOrderId = null;
      return;
    }
    this.selectedOrderId = order.id;
    this.selectedOrder = order;
    this.fetchDetailIfNeeded(order);
  }

  private fetchDetailIfNeeded(order: ApiOrder): void {
    // Backend ya devuelve items + statusLogs en /profile/my-orders (endpoint detalle no existe)
    const cached = this.detailCache.get(order.id);
    if (cached?.fetched) return;
    this.detailCache.set(order.id, {
      loading: false,
      items: this.extractItems(order),
      fetched: true,
    });
  }

  private extractItems(order: ApiOrder): ApiOrderItem[] {
    const raw = order?.items ?? (order as any).orderItems ?? (order as any).products ?? [];
    return Array.isArray(raw) ? (raw as ApiOrderItem[]) : [];
  }

  isDetailLoading(orderId: number): boolean {
    return this.detailCache.get(orderId)?.loading ?? false;
  }

  statusMeta(status?: string | null): { label: string; color: string } {
    return STATUS_META[status ?? ''] ?? { label: status ?? 'Pendiente', color: 'bg-slate-100 text-slate-700 border-slate-300' };
  }

  getCustomerFullName(): string {
    const fromOrders = this.orders[0]?.customerName?.trim();
    if (fromOrders) return fromOrders;
    const fullName = `${this.customer?.name ?? ''} ${this.customer?.lastName ?? ''}`.trim();
    return fullName || 'Cliente';
  }

  getOrderContactName(order: ApiOrder | null): string {
    return order?.contact?.name ?? order?.contactName ?? '—';
  }

  getOrderContactWhatsapp(order: ApiOrder | null): string | null {
    return order?.contact?.whatsapp ?? order?.contactWhatsapp ?? null;
  }

  getOrderBranch(order: ApiOrder | null) {
    return order?.delivery?.branch ?? order?.branch ?? null;
  }

  getItemBrand(item: ApiOrderItem): string {
    return String(item.product?.brand ?? item.brand ?? '');
  }

  getOrderItems(order: ApiOrder | null): ApiOrderItem[] {
    if (!order) return [];
    const raw = (order as any).items ?? (order as any).orderItems ?? (order as any).products ?? [];
    const embedded: ApiOrderItem[] = Array.isArray(raw) ? (raw as ApiOrderItem[]) : [];
    if (embedded.length > 0) return embedded;
    // Fallback: usar caché de detalle lazy-loaded
    return this.detailCache.get(order.id)?.items ?? [];
  }

  getOrderTotal(order: ApiOrder | null): number {
    if (!order) return 0;
    if (typeof order.total === 'number') return order.total;
    return this.getOrderItems(order).reduce((sum, item) => {
      return sum + this.getItemSubtotal(item);
    }, 0);
  }

  getItemName(item: ApiOrderItem): string {
    // 1. Nombre del producto (relación anidada nueva shape)
    const name = item.product?.name ?? (item as any).name ?? null;
    if (typeof name === 'string' && name.trim()) return name;
    // 2. Descripción corta de la variante
    const desc = String(item.shortDescription ?? item.description ?? '').trim();
    if (desc) return desc.length > 80 ? desc.slice(0, 77) + '…' : desc;
    // 3. SKU como último recurso
    return item.sku ?? `Variante #${item.variantId ?? '-'}`;
  }

  getItemVariantSubtitle(item: ApiOrderItem): string {
    return String(item.shortDescription ?? '').trim();
  }

  getItemAmount(item: ApiOrderItem): number {
    // La API devuelve la cantidad en OrderProduct.amount (tabla pivot)
    return Number((item as any).OrderProduct?.amount ?? item.amount ?? 0);
  }

  getItemPrice(item: ApiOrderItem): number {
    return Number(item.OrderProduct?.unitPrice ?? item.price ?? 0);
  }

  getItemSku(item: ApiOrderItem): string {
    return String(item.sku ?? (item as any).product?.sku ?? '-');
  }

  getItemImage(item: ApiOrderItem): string {
    return String(item.imageUrl ?? (item as any).product?.imageUrl ?? '/assets/placeholders/product.svg');
  }

  getItemSubtotal(item: ApiOrderItem): number {
    return this.getItemAmount(item) * this.getItemPrice(item);
  }

  // Progress bar helpers
  readonly statusSteps = STATUS_STEPS;

  getStatusStepIndex(status?: string | null): number {
    if (status === 'cancelado') return -1;
    return STATUS_STEPS.indexOf(status ?? 'pendiente');
  }

  isStepCompleted(status: string | null | undefined, stepIdx: number): boolean {
    return this.getStatusStepIndex(status) >= stepIdx;
  }

  isStepActive(status: string | null | undefined, stepIdx: number): boolean {
    return this.getStatusStepIndex(status) === stepIdx;
  }

  isCancelled(status?: string | null): boolean {
    return status === 'cancelado';
  }

  getOrderDetail(order: ApiOrder | null): string {
    return String((order as any)?.detail ?? '').trim();
  }

  stepLabel(step: string): string {
    return STATUS_META[step]?.label ?? step;
  }

  selectFirst(): void {
    if (this.orders.length && !this.selectedOrderId) {
      this.toggleDetail(this.orders[0]);
    }
  }

  getOrderItemsCount(order: ApiOrder | null): number {
    return this.getOrderItems(order).reduce((sum, item) => sum + this.getItemAmount(item), 0);
  }

  getDeliveryLabel(order: ApiOrder | null): string {
    const mode = order?.delivery?.mode ?? order?.deliveryMode;
    if (!mode) return '—';
    return mode === 'recojo_tienda' ? 'Recojo en tienda' : 'Envío a domicilio';
  }

  getStatusLogs(order: ApiOrder | null): Array<{ id: number; toStatus: string; fromStatus: string | null; note?: string | null; createdAt?: string; admin?: { email: string } }> {
    const raw =
      (order as any)?.statusLogs ??
      (order as any)?.status_logs ??
      (order as any)?.transitions ??
      (order as any)?.history ??
      [];
    const list = Array.isArray(raw) ? raw : [];
    return [...list].sort((a, b) => {
      const at = new Date(a?.createdAt ?? 0).getTime();
      const bt = new Date(b?.createdAt ?? 0).getTime();
      return at - bt;
    });
  }

  getDeliveryWhatsapp(order: ApiOrder | null): string | null {
    return order?.delivery?.whatsapp ?? order?.deliveryWhatsapp ?? null;
  }

  getOrderBranchLabel(order: ApiOrder | null): string {
    const b = this.getOrderBranch(order);
    if (!b) return 'Sin sucursal asignada';
    return b.city ? `${b.name} · ${b.city}` : b.name;
  }
}
