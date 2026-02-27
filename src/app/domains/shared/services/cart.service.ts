import { Injectable, computed, effect, signal } from '@angular/core';
import { Product } from '../models/product.model';
import { TokenService } from './token.service';
import { SessionService } from './session.service';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly guestKey = 'cart_guest_v1';
  private readonly userPrefix = 'cart_user_';
  private activeStorageKey = this.guestKey;
  private syncing = false;

  cart = signal<Product[]>([]);
  total = computed(() => {
    const cart = this.cart();
    return cart.reduce((total, product) => total + product.price, 0);
  })

  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService
  ) {
    this.syncWithCurrentSession(true);

    effect(() => {
      const list = this.cart();
      if (this.syncing) {
        return;
      }
      this.writeCart(this.activeStorageKey, list);
    });
  }

  private storageKeyForUser(userId: number): string {
    return `${this.userPrefix}${userId}`;
  }

  private resolveStorageKey(): string {
    const userId = this.tokenService.getUserIdFromToken() ?? this.sessionService.getCurrentUserIdFromSession();
    if (userId && userId > 0) {
      return this.storageKeyForUser(userId);
    }
    return this.guestKey;
  }

  private readCart(key: string): Product[] {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Product[]) : [];
    } catch {
      return [];
    }
  }

  private writeCart(key: string, cart: Product[]): void {
    localStorage.setItem(key, JSON.stringify(cart));
  }

  private setCartWithoutPersist(cart: Product[]): void {
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

    if (nextKey === this.activeStorageKey) {
      return;
    }

    const previousKey = this.activeStorageKey;
    const previousCart = this.cart();
    this.writeCart(previousKey, previousCart);

    const nextCart = this.readCart(nextKey);
    const merged = nextCart.length ? nextCart : previousCart;
    this.activeStorageKey = nextKey;
    this.setCartWithoutPersist(merged);
    this.writeCart(nextKey, merged);
  }

  /* addToCart(product: Product) {
    this.cart.update(state => [...state, product]);
  } */
 addToCart(product: Product) {
    this.syncWithCurrentSession();
    this.cart.update(list => [...list, product]);
  }

  /** Alias para compatibilidad con el header (botón “+”) */
  addOne(product: Product) {
    this.addToCart(product);
  }
  private keyOf(p: Product): string {
    return String((p as any).id ?? (p as any).slug ?? (p as any).sku ?? p.name);
  }

  removeFromCart(product: Product) {
    this.syncWithCurrentSession();
    this.cart.update(list => {
      const key = this.keyOf(product);
      const idx = list.findIndex(p => this.keyOf(p) === key);
      if (idx === -1) return list;
      const next = list.slice();
      next.splice(idx, 1);
      return next;
    });
  }

  removeAllFromCart(product: Product) {
    this.syncWithCurrentSession();
    const key = this.keyOf(product);
    this.cart.update(list => list.filter(p => this.keyOf(p) !== key));
  }

  clear() {
    this.syncWithCurrentSession();
    this.cart.set([]);
  }
}
