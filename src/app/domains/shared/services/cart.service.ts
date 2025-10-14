import { Injectable, computed, signal } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CartService {

  cart = signal<Product[]>([]);
  total = computed(() => {
    const cart = this.cart();
    return cart.reduce((total, product) => total + product.price, 0);
  })

  constructor() { }

  /* addToCart(product: Product) {
    this.cart.update(state => [...state, product]);
  } */
 addToCart(product: Product) {
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
    const key = this.keyOf(product);
    this.cart.update(list => list.filter(p => this.keyOf(p) !== key));
  }

  clear() {
    this.cart.set([]);
  }
}
