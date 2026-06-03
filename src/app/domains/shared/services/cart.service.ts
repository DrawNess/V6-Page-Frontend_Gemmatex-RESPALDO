import { Injectable, computed, effect, signal } from '@angular/core';
import { TokenService } from './token.service';
import { SessionService } from './session.service';

export interface CartItem {
  variantId: number;
  productId: number;
  name: string;
  sku: string;
  price: number;
  discountPrice: number | null;
  imageUrl: string;
  colorName?: string | null;
  colorHex?: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly guestKey = 'cart_guest_v1';
  private readonly userPrefix = 'cart_user_';
  private activeStorageKey = this.guestKey;
  private syncing = false;

  cart = signal<CartItem[]>([]);
  total = computed(() =>
    this.cart().reduce((sum, item) => sum + (item.discountPrice ?? item.price), 0)
  );

  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService
  ) {
    this.syncWithCurrentSession(true);

    effect(() => {
      const list = this.cart();
      if (this.syncing) return;
      this.writeCart(this.activeStorageKey, list);
    });
  }

  private storageKeyForUser(userId: string): string {
    return `${this.userPrefix}${userId}`;
  }

  private resolveStorageKey(): string {
    const userId =
      this.tokenService.getUserIdFromToken() ??
      this.sessionService.getCurrentUserIdFromSession();
    if (typeof userId === 'string' && userId.length > 0) {
      return this.storageKeyForUser(userId);
    }
    return this.guestKey;
  }

  private readCart(key: string): CartItem[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
    } catch {
      return [];
    }
  }

  private writeCart(key: string, cart: CartItem[]): void {
    localStorage.setItem(key, JSON.stringify(cart));
  }

  private setCartWithoutPersist(cart: CartItem[]): void {
    this.syncing = true;
    this.cart.set(cart);
    this.syncing = false;
  }

  syncWithCurrentSession(initial = false): void {
    const nextKey = this.resolveStorageKey();
    if (initial) {
      this.activeStorageKey = nextKey;
      this.setCartWithoutPersist(this.readCart(nextKey));
      return;
    }

    if (nextKey === this.activeStorageKey) return;

    const previousKey = this.activeStorageKey;
    const previousCart = this.cart();
    this.writeCart(previousKey, previousCart);

    const nextCart = this.readCart(nextKey);
    const merged = nextCart.length ? nextCart : previousCart;
    this.activeStorageKey = nextKey;
    this.setCartWithoutPersist(merged);
    this.writeCart(nextKey, merged);
  }

  addToCart(item: CartItem) {
    this.syncWithCurrentSession();
    this.cart.update(list => [...list, item]);
  }

  addOne(item: CartItem) {
    this.addToCart(item);
  }

  private keyOf(item: CartItem): string {
    return String(item.variantId);
  }

  removeFromCart(item: CartItem) {
    this.syncWithCurrentSession();
    this.cart.update(list => {
      const key = this.keyOf(item);
      const idx = list.findIndex(i => this.keyOf(i) === key);
      if (idx === -1) return list;
      const next = list.slice();
      next.splice(idx, 1);
      return next;
    });
  }

  removeAllFromCart(item: CartItem) {
    this.syncWithCurrentSession();
    const key = this.keyOf(item);
    this.cart.update(list => list.filter(i => this.keyOf(i) !== key));
  }

  clear() {
    this.syncWithCurrentSession();
    this.cart.set([]);
  }

  clearUserStorageKey(userId: string): void {
    localStorage.removeItem(this.storageKeyForUser(userId));
  }
}
