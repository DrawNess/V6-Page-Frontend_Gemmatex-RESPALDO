import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { CartService, CartItem } from '@shared/services/cart.service';
import { CheckoutFlowService } from '@shared/services/checkout-flow.service';
import { OrderService } from '@shared/services/order.service';
import { ProfileService } from '@shared/services/profile.service';
import { ApiBranch } from '@shared/models/user-portal.model';
import { catchError, concatMap, finalize, from, map, of, toArray } from 'rxjs';

type CheckoutOrderItem = { variantId: number; amount: number };
type DeliveryMode = 'recojo_tienda' | 'envio_domicilio';

@Component({
  selector: 'app-shipping',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './shipping.component.html',
  styleUrl: './shipping.component.css',
})
export class ShippingComponent {
  private readonly cartService    = inject(CartService);
  private readonly orderService   = inject(OrderService);
  private readonly checkoutFlow   = inject(CheckoutFlowService);
  private readonly profileService = inject(ProfileService);

  readonly checkoutPath      = `/${ROUTE_CONSTANTS.PUBLIC.CHECKOUT}`;
  readonly accountOrdersPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.ORDERS}`;

  cart  = this.cartService.cart;
  total = this.cartService.total;

  loading        = signal(false);
  profileLoading = signal(false);
  branchesLoading = signal(false);
  errorMsg       = signal('');
  successMsg     = signal('');
  createdOrderId = signal<number | null>(null);
  whatsappUrl    = signal('');

  customerName   = signal('');
  customerPhone  = signal('');
  deliveryPhone  = signal('');
  deliveryMode   = signal<DeliveryMode>('envio_domicilio');
  orderNotes     = signal('');

  branches       = signal<ApiBranch[]>([]);
  selectedBranchId = signal<number | null>(null);
  selectedBranch   = computed(() => this.branches().find(b => b.id === this.selectedBranchId()) ?? null);

  groupedCart = computed(() => {
    const map = new Map<string, { product: CartItem; count: number; unitPrice: number }>();
    for (const item of this.cart()) {
      const key = String(item.variantId);
      if (!map.has(key)) {
        map.set(key, { product: item, count: 0, unitPrice: item.discountPrice ?? item.price });
      }
      map.get(key)!.count += 1;
    }
    return [...map.values()];
  });

  formValid = computed(() => {
    const nameOk   = this.customerName().trim().length >= 2;
    const phoneOk  = /^(\+?591)?\d{8,11}$/.test(this.customerPhone().trim().replace(/\s+/g, ''));
    const branchOk = this.deliveryMode() !== 'recojo_tienda' || this.selectedBranchId() !== null;
    return nameOk && phoneOk && branchOk && this.groupedCart().length > 0;
  });

  constructor() {
    // Load branches from API
    this.branchesLoading.set(true);
    this.orderService.getBranches().pipe(
      catchError(() => of([] as ApiBranch[])),
      finalize(() => this.branchesLoading.set(false))
    ).subscribe(branches => {
      this.branches.set(branches);
      // Restore draft (persisted from checkout step 1)
      const draft = this.checkoutFlow.getDraft();
      if (draft) {
        if (draft.customerName)  this.customerName.set(draft.customerName);
        if (draft.customerPhone) this.customerPhone.set(draft.customerPhone);
        if (draft.deliveryPhone) this.deliveryPhone.set(draft.deliveryPhone);
        if (draft.notes)         this.orderNotes.set(draft.notes);
        if (draft.deliveryMode)  this.deliveryMode.set(draft.deliveryMode);
        if (draft.branchId && branches.some(b => b.id === draft.branchId)) {
          this.selectedBranchId.set(draft.branchId);
        }
      }
      // Default to first active branch
      if (!this.selectedBranchId() && branches.length > 0) {
        this.selectedBranchId.set(branches[0].id);
      }
    });

    // Pre-fill from customer profile (overwrites blank draft fields only)
    this.profileLoading.set(true);
    this.profileService.getMeDetails().pipe(
      catchError(() => of(null)),
      finalize(() => this.profileLoading.set(false))
    ).subscribe(details => {
      if (!details?.customer) return;
      const { name = '', lastName = '', phone = '' } = details.customer;
      const fullName = `${name} ${lastName}`.trim();
      if (fullName && !this.customerName()) this.customerName.set(fullName);
      if (phone   && !this.customerPhone()) this.customerPhone.set(phone);
    });
  }

  itemSubtotal(item: { unitPrice: number; count: number }) {
    return (item.unitPrice ?? 0) * (item.count ?? 0);
  }

  branchWhatsappPhone(branch: ApiBranch): string {
    if (!branch.phone) return '';
    const digits = String(branch.phone).replace(/\D+/g, '');
    return digits.startsWith('591') ? digits : `591${digits}`;
  }

  private fmtBOB(n: number): string {
    try {
      return new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB',
        minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    } catch { return `Bs ${n.toFixed(2)}`; }
  }

  private parseError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const msg = (err.error as any)?.message ?? (err.error as any)?.error;
      if (typeof msg === 'string' && msg.trim()) return msg;
      if (Array.isArray(msg) && msg.length) return msg.join(', ');
      if (err.status === 401) return 'Tu sesión expiró. Inicia sesión nuevamente.';
      if (err.status === 403) return 'No tienes permiso para registrar el pedido.';
      if (err.status === 400) return 'Datos inválidos. Revisa el formulario.';
    }
    return 'No se pudo registrar el pedido. Intenta nuevamente.';
  }

  private extractOrderId(response: unknown): number | null {
    const data = response as any;
    const direct = Number(data?.id);
    if (!Number.isNaN(direct) && direct > 0) return direct;
    const nested = Number(data?.order?.id ?? data?.newOrder?.id ?? data?.data?.id);
    return !Number.isNaN(nested) && nested > 0 ? nested : null;
  }

  private buildOrderItems(): CheckoutOrderItem[] {
    return this.groupedCart()
      .map(item => ({
        variantId: Number(item.product?.variantId),
        amount: Math.max(1, Math.min(999, Math.floor(Number(item.count ?? 1)))),
      }))
      .filter(item => Number.isFinite(item.variantId) && item.variantId > 0 && item.amount > 0);
  }

  private buildWhatsAppMessage(orderId: number): string {
    const sep = '─────────────────────';
    const lines: string[] = [];

    // Encabezado
    lines.push('*NUEVO PEDIDO — Gemmatex*');
    lines.push(sep);
    lines.push('');
    lines.push(`*Orden:* #${orderId}`);
    lines.push(`*Cliente:* ${this.customerName().trim()}`);
    lines.push(`*WhatsApp:* ${this.customerPhone().trim()}`);
    if (this.deliveryPhone().trim()) {
      lines.push(`*WSP entrega:* ${this.deliveryPhone().trim()}`);
    }
    lines.push(`*Modalidad:* ${this.deliveryMode() === 'recojo_tienda' ? 'Recojo en tienda' : 'Envío a coordinar'}`);
    lines.push(`*Sucursal:* ${this.selectedBranch()?.name ?? ''}`);

    // Productos
    lines.push('');
    lines.push(sep);
    lines.push('*PRODUCTOS*');
    lines.push(sep);

    this.groupedCart().forEach((item, i) => {
      lines.push('');
      lines.push(`*${i + 1}. ${item.product.name}*`);
      if (item.product.colorName) {
        lines.push(`    Color: ${item.product.colorName}`);
      }
      if (item.product.sku) {
        lines.push(`    SKU: ${item.product.sku}`);
      }
      lines.push(`    Cant: *${item.count}* x ${this.fmtBOB(item.unitPrice)}`);
      lines.push(`    Subtotal: ${this.fmtBOB(this.itemSubtotal(item))}`);
    });

    // Total
    lines.push('');
    lines.push(sep);
    lines.push(`*TOTAL: ${this.fmtBOB(this.total())}*`);
    lines.push(sep);

    // Nota
    if (this.orderNotes().trim()) {
      lines.push('');
      lines.push(`*Nota:* ${this.orderNotes().trim()}`);
    }

    // Enlace al pedido
    lines.push('');
    lines.push(`Ver pedido: https://gemmatex.com.bo${this.accountOrdersPath}`);

    return lines.join('\n');
  }

  sendToSeller(): void {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.createdOrderId.set(null);

    if (!this.formValid()) {
      this.errorMsg.set('Por favor completa tu nombre y teléfono.');
      return;
    }

    const items = this.buildOrderItems();
    if (!items.length) {
      this.errorMsg.set('No hay productos válidos en tu bolsa.');
      return;
    }

    const isPickup = this.deliveryMode() === 'recojo_tienda';
    const branch = this.selectedBranch();
    if (isPickup && !branch) {
      this.errorMsg.set('Selecciona una sucursal.');
      return;
    }

    this.loading.set(true);

    // Save draft before API call (in case of page refresh)
    this.checkoutFlow.saveDraft({
      orderId: 0,
      branchId: this.selectedBranchId(),
      customerName: this.customerName().trim(),
      customerPhone: this.customerPhone().trim(),
      deliveryPhone: this.deliveryPhone().trim() || undefined,
      deliveryMode: this.deliveryMode(),
      notes: this.orderNotes().trim(),
    });
    const orderDto = {
      contactName: this.customerName().trim(),
      contactWhatsapp: this.customerPhone().trim(),
      deliveryMode: this.deliveryMode(),
      branchId: isPickup ? (this.selectedBranchId() ?? undefined) : undefined,
      deliveryWhatsapp: this.deliveryPhone().trim() || undefined,
      detail: this.orderNotes().trim() || undefined,
    };

    // Step 1: create order, Step 2: add all items
    this.orderService.createOrder(orderDto).pipe(
      map(response => this.extractOrderId(response)),
      concatMap(orderId => {
        if (!orderId) throw new Error('ORDER_ID_NOT_FOUND');
        this.createdOrderId.set(orderId);
        return from(items).pipe(
          concatMap(item => this.orderService.addItem({ orderId, ...item })),
          toArray(),
          map(() => orderId)
        );
      }),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (orderId) => {
        this.successMsg.set(`Pedido #${orderId} registrado correctamente.`);

        const branchPhone = branch ? this.branchWhatsappPhone(branch) : '';
        const text = encodeURIComponent(this.buildWhatsAppMessage(orderId));
        const url  = branchPhone
          ? `https://api.whatsapp.com/send?phone=${branchPhone}&text=${text}`
          : `https://api.whatsapp.com/send?text=${text}`;
        this.whatsappUrl.set(url);

        this.checkoutFlow.clearDraft();
        this.cartService.clear();

        const win = window.open(url, '_blank');
        if (!win) { /* no redirigir, el botón manual queda disponible */ }
        else { try { (win as any).opener = null; } catch { /* noop */ } }
      },
      error: err => { this.errorMsg.set(this.parseError(err)); },
    });
  }
}
