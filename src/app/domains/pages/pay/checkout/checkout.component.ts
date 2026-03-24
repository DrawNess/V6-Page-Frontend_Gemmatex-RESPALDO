import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService, CartItem } from '@shared/services/cart.service';
import { TokenService } from '@services/token.service';
import { CheckoutFlowService } from '@shared/services/checkout-flow.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, RouterLink, FormsModule],
  templateUrl: './checkout.component.html',
  styleUrl: './checkout.component.css',
})
export class CheckoutComponent {
  private readonly cartService = inject(CartService);
  private readonly tokenService = inject(TokenService);
  private readonly checkoutFlowService = inject(CheckoutFlowService);
  private readonly router = inject(Router);

  cart  = this.cartService.cart;
  total = this.cartService.total;

  // Notes for the seller (sent as `detail` to the API)
  orderNotes = signal('');

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

  isEmpty         = computed(() => this.cart().length === 0);
  checkoutDisabled = computed(() => this.isEmpty());
  isLoggedIn      = computed(() => this.tokenService.isAuthenticated());

  trackByItem = (_: number, item: { product: CartItem }) => item.product.variantId;

  inc(item: CartItem)       { this.cartService.addOne(item); }
  dec(item: CartItem)       { this.cartService.removeFromCart(item); }
  removeAll(item: CartItem) { this.cartService.removeAllFromCart(item); }
  clearCart() {
    const svc = this.cartService as any;
    if (typeof svc.clear === 'function') svc.clear();
    else this.cartService.cart.set([]);
  }

  itemSubtotal(item: { unitPrice: number; count: number }) {
    return (item.unitPrice ?? 0) * (item.count ?? 0);
  }

  placeOrder(ev?: Event) {
    ev?.preventDefault?.();
    ev?.stopPropagation?.();
    if (this.isEmpty()) return;

    if (!this.tokenService.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/checkout' } });
      return;
    }

    this.checkoutFlowService.saveDraft({
      orderId: 0,
      branchId: 'lp',
      customerName: '',
      customerPhone: '',
      notes: this.orderNotes().trim(),
    });
    void this.router.navigate([`/${ROUTE_CONSTANTS.PUBLIC.SHIPPING}`]);
  }
}
