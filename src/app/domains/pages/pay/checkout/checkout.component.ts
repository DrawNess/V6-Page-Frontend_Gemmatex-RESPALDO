import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '@shared/services/cart.service';
import { Product } from '@shared/models/product.model';
import { TokenService } from '@services/token.service';
import { CheckoutFlowService } from '@shared/services/checkout-flow.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

@Component({
    selector: 'app-checkout',
    imports: [CommonModule, RouterLink],
    templateUrl: './checkout.component.html',
    styleUrl: './checkout.component.css'
})
export class CheckoutComponent {

  private readonly cartService = inject(CartService);
  private readonly tokenService = inject(TokenService);
  private readonly checkoutFlowService = inject(CheckoutFlowService);
  private readonly router = inject(Router);

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

  private readonly defaultBranchId = 'lp';
  submitError = signal('');

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

  isEmpty = computed(() => this.cart().length === 0);
  checkoutDisabled = computed(() => this.isEmpty());

  itemSubtotal(item: { unitPrice: number; count: number }) {
    return (item.unitPrice ?? 0) * (item.count ?? 0);
  }

  placeOrder(ev?: Event) {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();

    if (this.isEmpty()) {
      return;
    }

    this.submitError.set('');

    if (!this.tokenService.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/checkout' }
      });
      return;
    }

    this.checkoutFlowService.saveDraft({
      orderId: 0,
      branchId: this.defaultBranchId,
      customerName: '',
      customerPhone: '',
      notes: '',
    });
    void this.router.navigate([`/${ROUTE_CONSTANTS.PUBLIC.SHIPPING}`]);
  }
}
