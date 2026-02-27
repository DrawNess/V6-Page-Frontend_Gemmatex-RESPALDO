import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '@environments/environment';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { Product } from '@shared/models/product.model';
import { CartService } from '@shared/services/cart.service';
import { CheckoutFlowService } from '@shared/services/checkout-flow.service';
import { OrderService } from '@shared/services/order.service';
import { concatMap, finalize, from, map, toArray } from 'rxjs';

type Branch = { id: string; name: string; phone: string; address?: string };
type CheckoutOrderItem = { productId: number; amount: number };
type DeliveryMode = 'pickup_store' | 'shipping_coordination';

@Component({
  selector: 'app-shipping',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './shipping.component.html',
  styleUrl: './shipping.component.css',
})
export class ShippingComponent {
  private readonly cartService = inject(CartService);
  private readonly orderService = inject(OrderService);
  private readonly checkoutFlow = inject(CheckoutFlowService);

  readonly checkoutPath = `/${ROUTE_CONSTANTS.PUBLIC.CHECKOUT}`;
  readonly accountOrdersPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.ORDERS}`;

  cart = this.cartService.cart;
  total = this.cartService.total;

  loading = signal(false);
  errorMsg = signal('');
  successMsg = signal('');
  createdOrderId = signal<number | null>(null);

  customerName = signal('');
  customerPhone = signal('');
  shippingNotes = signal('');
  deliveryMode = signal<DeliveryMode>('shipping_coordination');

  branches: Branch[] = [
    { id: 'lp', name: 'La Paz', phone: this.branchPhone(environment.WSP_LPZ), address: 'Av. Illampu esq. Graneros Nº 682' },
    { id: 'sc', name: 'Santa Cruz', phone: this.branchPhone(environment.WSP_SCZ), address: 'Calle Isabela Católica Nº 275' },
    { id: 'cb', name: 'Cochabamba', phone: this.branchPhone(environment.WSP_CBBA), address: 'Av. Aroma c/ 16 de Julio y Av. Oquendo' },
  ];
  selectedBranchId = signal(this.branches[0].id);
  selectedBranch = computed(() => this.branches.find((b) => b.id === this.selectedBranchId()));

  groupedCart = computed(() => {
    const map = new Map<string, { product: Product; count: number; unitPrice: number }>();
    for (const p of this.cart()) {
      const key = String((p as any).id ?? (p as any).slug ?? JSON.stringify(p));
      if (!map.has(key)) {
        map.set(key, { product: p, count: 0, unitPrice: p.price ?? 0 });
      }
      map.get(key)!.count += 1;
    }
    return [...map.values()];
  });

  formValid = computed(() => {
    const nameOk = this.customerName().trim().length >= 2;
    const phoneOk = /^(\+?591)?\d{8,11}$/.test(this.customerPhone().trim().replace(/\s+/g, ''));
    return nameOk && phoneOk && this.groupedCart().length > 0;
  });

  constructor() {
    const draft = this.checkoutFlow.getDraft();
    if (draft) {
      this.customerName.set(draft.customerName ?? '');
      this.customerPhone.set(draft.customerPhone ?? '');
      this.shippingNotes.set(draft.notes ?? '');
      if (this.branches.some((b) => b.id === draft.branchId)) {
        this.selectedBranchId.set(draft.branchId);
      }
    }
  }

  itemSubtotal(item: { unitPrice: number; count: number }) {
    return (item.unitPrice ?? 0) * (item.count ?? 0);
  }

  private fmtBOB(n: number): string {
    try {
      return new Intl.NumberFormat('es-BO', {
        style: 'currency',
        currency: 'BOB',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(n);
    } catch {
      return `Bs ${n.toFixed(2)}`;
    }
  }

  private branchPhone(rawNumber: number | string): string {
    const localNumber = String(rawNumber).replace(/\D+/g, '');
    return `591${localNumber}`;
  }

  private parseError(err: unknown): string {
    if (err instanceof HttpErrorResponse) {
      const payload = err.error as any;
      const msg = payload?.message || payload?.error;
      if (typeof msg === 'string' && msg.trim()) {
        return msg;
      }
      if (Array.isArray(msg) && msg.length) {
        return msg.join(', ');
      }
      if (err.status === 401) {
        return 'Tu sesión expiró. Inicia sesión nuevamente.';
      }
      if (err.status === 403) {
        return 'No tienes permisos para registrar el pedido.';
      }
      if (err.status === 400) {
        return 'Datos inválidos para registrar el pedido.';
      }
    }
    return 'No se pudo registrar el pedido. Intenta nuevamente.';
  }

  private extractOrderId(response: unknown): number | null {
    const data = response as any;
    const directId = Number(data?.id);
    if (!Number.isNaN(directId) && directId > 0) {
      return directId;
    }
    const nestedId = Number(data?.order?.id ?? data?.newOrder?.id ?? data?.data?.id);
    if (!Number.isNaN(nestedId) && nestedId > 0) {
      return nestedId;
    }
    return null;
  }

  private buildOrderItems(): CheckoutOrderItem[] {
    return this.groupedCart()
      .map((item) => {
        const productId = Number(item.product?.id);
        const amount = Math.max(1, Math.min(999, Math.floor(Number(item.count ?? 1))));
        return { productId, amount };
      })
      .filter((item) => Number.isFinite(item.productId) && item.productId > 0 && item.amount > 0);
  }

  private buildMessage(orderId: number): string {
    const lines: string[] = [];
    lines.push('*COORDINACION DE ENVIO*');
    lines.push(`Orden: #${orderId}`);
    lines.push(`Cliente: ${this.customerName().trim()}`);
    lines.push(`Telefono: ${this.customerPhone().trim()}`);
    lines.push(
      `Modalidad: ${
        this.deliveryMode() === 'pickup_store'
          ? 'Recojo en tienda'
          : 'Envío a coordinar con ejecutivo de ventas'
      }`
    );
    lines.push(`Sucursal: ${this.selectedBranch()?.name ?? 'No definida'}`);
    lines.push('');
    lines.push('*DETALLE DEL PEDIDO*');

    this.groupedCart().forEach((item, idx) => {
      lines.push(`${idx + 1}. ${item.product.name} x${item.count}`);
    });

    lines.push('');
    lines.push(`Subtotal: ${this.fmtBOB(this.total())}`);
    if (this.shippingNotes().trim()) {
      lines.push('');
      lines.push('*Notas*');
      lines.push(this.shippingNotes().trim());
    }
    return lines.join('\n');
  }

  sendToSeller(): void {
    this.errorMsg.set('');
    this.successMsg.set('');
    this.createdOrderId.set(null);

    if (!this.formValid()) {
      this.errorMsg.set('Completa nombre, teléfono y verifica tu carrito.');
      return;
    }

    const items = this.buildOrderItems();
    if (!items.length) {
      this.errorMsg.set('No hay productos válidos para registrar en la orden.');
      return;
    }

    const branch = this.selectedBranch();
    if (!branch) {
      this.errorMsg.set('Debes seleccionar una sucursal.');
      return;
    }

    this.loading.set(true);

    this.orderService.createOrder().pipe(
      map((response) => this.extractOrderId(response)),
      concatMap((orderId) => {
        if (!orderId) {
          throw new Error('ORDER_ID_NOT_FOUND');
        }
        this.createdOrderId.set(orderId);
        return from(items).pipe(
          concatMap((item) => this.orderService.addItem({ orderId, ...item })),
          toArray(),
          map(() => orderId)
        );
      }),
      finalize(() => this.loading.set(false))
    ).subscribe({
      next: (orderId) => {
        this.successMsg.set(`Pedido #${orderId} registrado correctamente.`);
        const text = encodeURIComponent(this.buildMessage(orderId));
        const url = `https://api.whatsapp.com/send?phone=${branch.phone}&text=${text}`;

        this.checkoutFlow.clearDraft();
        this.cartService.clear();

        const win = window.open(url, '_blank');
        if (!win) {
          window.location.href = url;
          return;
        }
        try {
          (win as any).opener = null;
        } catch {
          // noop
        }
      },
      error: (err) => {
        this.errorMsg.set(this.parseError(err));
      },
    });
  }
}
