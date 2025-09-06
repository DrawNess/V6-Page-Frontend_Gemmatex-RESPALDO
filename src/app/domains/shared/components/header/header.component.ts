import { Component, Input, SimpleChanges, inject, signal ,computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { RouterLinkWithHref, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLinkWithHref, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  hideSideMenu = signal(true);
  private cartService = inject(CartService);
  cart = this.cartService.cart;
  total = this.cartService.total;

  toogleSideMenu() {
    this.hideSideMenu.update(prevState => !prevState);
  }

/* agregacion */

  openMenu: string | null = null;
  closeTimer: any = null;

  onEnter(menu: string) {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.openMenu = menu;
  }

  onLeave(menu: string) {
    this.closeTimer = setTimeout(() => {
      if (this.openMenu === menu) this.openMenu = null;
    }, 150);
  }

  toggleMenu(ev: Event, menu: string) {
    ev.preventDefault(); // soporte para móviles
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  // Opcional: mini-cart lateral
  toggleCart() {
    // tu lógica para abrir/cerrar el side-cart
  }
  // Número WhatsApp en formato internacional (sin +), ej. Bolivia: 5917XXXXXXX
  whatsAppPhone = '59171952341';

  waLink(): string {
    const lines = this.groupedCart().map(({ product, count, unitPrice }) => {
      const subtotal = (unitPrice * count).toFixed(2);
      return `• ${product.name} x${count} — Bs. ${subtotal}`;
    });

    const totalStr = (typeof this.total() === 'number')
      ? this.total().toFixed(2)
      : String(this.total());

    const message = `Hola, quiero hacer un pedido: ${lines.join('\n')}
    Total: Bs. ${totalStr}
    ¿Me ayuda con la compra?`

    return `https://wa.me/${this.whatsAppPhone}?text=${encodeURIComponent(message)}`;
  }


  // Tip opcional (ajusta a tu modelo real)
  private keyOf(p: any): string {
    return String(p?.id ?? p?.slug);
  }
  removeFromCart(product: any) {
    const key = this.keyOf(product);
    let removed = false;
    this.cart.set(
      this.cart().filter(item => {
        if (!removed && this.keyOf(item) === key) {
          removed = true;               // elimina solo una
          return false;
        }
        return true;
      })
    );
  }
  removeAllFromCart(product: any) {
    const key = this.keyOf(product);
    this.cart.set(this.cart().filter(item => this.keyOf(item) !== key));
  }
/* ---------------- */
  private unitPrice(p: Product): number {
    const d = Number(p.discountPrice);
    const base = Number(p.price);
    return !isNaN(d) && d > 0 ? d : base;
  }
  /* Agrupar items */
  groupedCart = computed(() => {
    const map = new Map<string, { product: Product; count: number; unitPrice: number }>();

    for (const p of this.cart()) {
      const key = String(p?.id ?? p?.slug);
      const price = this.unitPrice(p);
      const cur = map.get(key);
      if (cur) {
        cur.count += 1;
      } else {
        map.set(key, { product: p, count: 1, unitPrice: price });
      }
    }
    return Array.from(map.values());
  });
  // Suma una unidad del mismo producto
  addOne(p: Product) {
  // Si usas CartService:
  this.cartService.addToCart(p);

  // ---- Alternativa SIN servicio (si prefieres manipular el signal directamente) ----
  // this.cart.set([...this.cart(), p]);
}
  

}
