import { Component, Input, SimpleChanges, inject, signal } from '@angular/core';
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



}
