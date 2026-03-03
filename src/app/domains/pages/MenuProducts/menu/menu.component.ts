import { Component, inject, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

type MenuIcon = 'box' | 'grid' | 'layers' | 'tags' | 'megaphone' | 'image' | 'ticket' | 'users' | 'receipt';
type MenuLink = { to: string | any[]; label: string; desc: string; icon: MenuIcon };
type MenuSection = { title: string; caption: string; links: MenuLink[] };

@Component({
  selector: 'app-menu',
  imports: [CommonModule, RouterLink],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {
  private readonly document = inject(DOCUMENT);
  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  private readonly catalogLinks: MenuLink[] = [
    {
      to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.OFFERS_MENU],
      label: 'Ofertas',
      desc: 'Configura ofertas visibles para el catalogo.',
      icon: 'ticket',
    },
    {
      to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.CATEGORIES],
      label: 'Categorias',
      desc: 'Crea, edita y ordena las categorias principales.',
      icon: 'grid',
    },
    {
      to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.SUBCATEGORIES],
      label: 'Subcategorias',
      desc: 'Organiza subniveles y relacion con categorias.',
      icon: 'layers',
    },
    {
      to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.PRODUCTS],
      label: 'Productos',
      desc: 'Administra SKUs, stock, precio e informacion base.',
      icon: 'box',
    },
  ];

  private readonly adsLinks: MenuLink[] = [
    {
      to: [this.adminBase, 'menu-adds', 'hero-slides'],
      label: 'Hero Slides',
      desc: 'Banners principales para desktop y movil.',
      icon: 'image',
    },
    {
      to: [this.adminBase, 'menu-adds', 'offers-adds'],
      label: 'Announcements',
      desc: 'Mensajes cortos para cabecera y avisos rapidos.',
      icon: 'megaphone',
    },
    {
      to: [this.adminBase, 'menu-adds', 'promo'],
      label: 'Promos',
      desc: 'Carrusel de promociones secundarias del home.',
      icon: 'tags',
    },
  ];

  private readonly usersLinks: MenuLink[] = [
    {
      to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.USERS],
      label: 'Administrar usuarios',
      desc: 'Busqueda por ID y actualizacion de datos base.',
      icon: 'users',
    },
    {
      to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.ORDERS_BY_CUSTOMER],
      label: 'Pedidos por cliente',
      desc: 'Vista UX para entender pedidos por cada customer.',
      icon: 'receipt',
    },
  ];

  readonly sections: MenuSection[] = [
    {
      title: 'Catalogo',
      caption: 'Estructura de productos y jerarquia comercial.',
      links: this.catalogLinks,
    },
    {
      title: 'Publicidad',
      caption: 'Contenido visual del home y bloques promocionales.',
      links: this.adsLinks,
    },
    {
      title: 'Usuarios',
      caption: 'Manejo y administracion de cuentas.',
      links: this.usersLinks,
    },
  ];

  trackBySection = (_: number, section: MenuSection) => section.title;
  trackByTo = (_: number, l: MenuLink) => Array.isArray(l.to) ? l.to.join('/') : l.to;

  copySecretUrl(): void {
    const url = this.document?.location?.href ?? '';
    if (!url) {
      return;
    }

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
      return;
    }

    const ta = this.document.createElement('textarea');
    ta.value = url;
    this.document.body.appendChild(ta);
    ta.select();
    try {
      this.document.execCommand('copy');
    } catch {}
    this.document.body.removeChild(ta);
  }
}
