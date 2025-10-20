import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CartService } from '@shared/services/cart.service';
import { Product } from '@shared/models/product.model';

type Branch = { id: string; name: string; phone: string; address?: string };

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css'
})
export class CheckoutComponent {

 private cartService = inject(CartService);

  // señales del servicio
  cart = this.cartService.cart; // Product[]

  // Grouped (usa el del service si existe; si no, calculo aquí)
  groupedCart = (this.cartService as any).groupedCart ?? computed(() => {
    const map = new Map<string, { product: Product; count: number; unitPrice: number }>();
    for (const p of this.cart()) {
      const key = String((p as any).id ?? (p as any).slug ?? JSON.stringify(p));
      if (!map.has(key)) map.set(key, { product: p, count: 0, unitPrice: p.price ?? 0 });
      map.get(key)!.count += 1;
    }
    return [...map.values()];
  });

  // Total (usa el del service si existe; si no, calculo aquí)
  total = (this.cartService as any).total ?? computed(() =>
    this.cart().reduce((acc, p) => acc + (p.price ?? 0), 0)
  );

  // Datos del cliente
  customerName = signal<string>('');
  customerPhone = signal<string>('');
  notes = signal<string>('');

  // Sucursales
  branches: Branch[] = [
    { id: 'lp', name: 'La Paz',      phone: '59171926087', address: 'Av. Illampu esq. Graneros Nº 682' },
    { id: 'sc', name: 'Santa Cruz',  phone: '59163565431', address: 'Calle Isabela Católica Nº 275' },
    { id: 'cb', name: 'Cochabamba',  phone: '59162537431', address: 'Av. Aroma c/ 16 de Julio y Av. Oquendo' },
  ];
  selectedBranchId = signal<string>(this.branches[0].id);
  selectedBranch = computed<Branch | undefined>(() =>
    this.branches.find(b => b.id === this.selectedBranchId())
  );

  // TrackBy
  trackByItem = (_: number, item: { product: Product }) =>
    (item.product as any).id ?? (item.product as any).slug ?? _;

  // Acciones línea (fallbacks si tu CartService no trae helpers)
  inc(p: Product) {
    const svc: any = this.cartService as any;
    if (typeof svc.addOne === 'function') return svc.addOne(p);
    this.cartService.addToCart(p);
  }
  dec(p: Product) {
    const svc: any = this.cartService as any;
    if (typeof svc.removeFromCart === 'function') return svc.removeFromCart(p);
    // quitar 1 del array
    const arr = this.cart().slice();
    const idx = arr.findIndex(x => (x as any).id === (p as any).id || (x as any).slug === (p as any).slug);
    if (idx > -1) {
      arr.splice(idx, 1);
      this.cartService.cart.set(arr);
    }
  }
  removeAll(p: Product) {
    const svc: any = this.cartService as any;
    if (typeof svc.removeAllFromCart === 'function') return svc.removeAllFromCart(p);
    const arr = this.cart().filter(x =>
      (x as any).id !== (p as any).id && (x as any).slug !== (p as any).slug
    );
    this.cartService.cart.set(arr);
  }
  clearCart() {
    const svc: any = this.cartService as any;
    if (typeof svc.clear === 'function') return svc.clear();
    this.cartService.cart.set([]);
  }

  // Helpers de validación
  nameValid = computed(() => this.customerName().trim().length >= 2);
  phoneSanitized = computed(() => this.customerPhone().trim().replace(/\s+/g, ''));
  phoneValid = computed(() => /^(\+?591)?\d{8,11}$/.test(this.phoneSanitized())); // simple
  isEmpty = computed(() => this.cart().length === 0);
  formValid = computed(() => this.nameValid() && this.phoneValid() && !this.isEmpty());

  // Formato moneda robusto
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

  itemSubtotal(item: { unitPrice: number; count: number }) {
    return (item.unitPrice ?? 0) * (item.count ?? 0);
  }

  // WhatsApp
  private waMessage(): string {
    const lines: string[] = [];
    lines.push(`*Pedido Gemmatex*`);
    lines.push(`Fecha: ${new Date().toLocaleString('es-BO')}`);
    lines.push('');
    lines.push(`*Cliente*: ${this.customerName().trim() || '—'}`);
    lines.push(`*Teléfono*: ${this.customerPhone().trim() || '—'}`);
    lines.push(`*Sucursal*: ${this.selectedBranch()?.name ?? '—'}`);
    lines.push('');
    lines.push(`*Detalle de productos:*`);
    for (const item of this.groupedCart()) {
      const sku = (item.product as any).sku ?? '—';
      const unit = item.unitPrice ?? item.product.price ?? 0;
      const subtotal = this.itemSubtotal(item);
      lines.push(
        `* (SKU: ${sku}) - ${item.product.name} X ${item.count} — ${this.fmtBOB(unit)} c/u — Subtotal: ${this.fmtBOB(subtotal)}`
      );
    }
    lines.push('');
    lines.push(`*TOTAL*: ${this.fmtBOB(this.total())}`);
    const extra = this.notes().trim();
    if (extra) {
      lines.push('');
      lines.push(`*Notas*: ${extra}`);
    }
    lines.push('');
    lines.push(`Gracias por su preferencia.`);
    return lines.join('\n');
  }

  waLink(): string {
    const phone = this.selectedBranch()?.phone ?? '';
    const text = encodeURIComponent(this.waMessage());
    return `https://wa.me/${phone}?text=${text}`;
  }

  placeOrder(ev?: Event) {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();

    if (!this.formValid()) return;

    const url = this.waLink();
    const win = window.open(url, '_blank');
    if (!win) {
      // popup bloqueado → abrir en la misma pestaña
      window.location.href = url;
    } else {
      try { (win as any).opener = null; } catch {}
    }
  }
}
