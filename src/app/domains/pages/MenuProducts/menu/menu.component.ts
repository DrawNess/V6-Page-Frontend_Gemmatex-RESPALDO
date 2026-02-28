import { Component, inject, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

type MenuLink = { to: string | any[]; label: string; desc: string; icon: 'box'|'grid'|'layers'|'tags'|'megaphone'|'image'|'ticket' };

type LinkItem = { to: string; label: string; desc: string; emoji?: string };
@Component({
    selector: 'app-menu',
    imports: [CommonModule, RouterLink],
    templateUrl: './menu.component.html',
    styleUrl: './menu.component.css'
})
export class MenuComponent {

 private document = inject(DOCUMENT);

  private readonly adminBase = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  // --- Catálogo
  private catalogLinks: MenuLink[] = [
    { to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.OFFERS_MENU],   label: 'Ofertas',      desc: 'Añadir Ofertas.', icon: 'ticket' },
    { to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.CATEGORIES],    label: 'Categorías',   desc: 'Crea, edita u ordena categorías.', icon: 'grid' },
    { to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.SUBCATEGORIES], label: 'Subcategorías',desc: 'Gestiona subniveles por categoría.', icon: 'layers' },
    { to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.PRODUCTS],      label: 'Productos',    desc: 'Alta rápida, stock y precios por SKU.', icon: 'box' },
  ];

  // --- Publicidad Home
  private adsLinks: MenuLink[] = [
    /* { to: [this.adminBase, ROUTE_CONSTANTS.ADMIN.MENU_ADDS],              label: 'Panel de publicidad', desc: 'Accesos a todos los módulos de home.', icon: 'megaphone' }, */
    { to: [this.adminBase, 'menu-adds', 'hero-slides'], label: 'Hero Slides',  desc: 'Banners principales (desktop/móvil).', icon: 'image' },
    { to: [this.adminBase, 'menu-adds', 'offers-adds'], label: 'Announcements', desc: 'Avisos/avisos tipo chip en el header.', icon: 'megaphone' },
    { to: [this.adminBase, 'menu-adds', 'promo'],       label: 'Promos',        desc: 'Slider de promociones secundarias.', icon: 'tags' },
  ];

  linksCatalog = () => this.catalogLinks;
  linksAds     = () => this.adsLinks;

  trackByTo = (_: number, l: MenuLink) => Array.isArray(l.to) ? l.to.join('/') : l.to;

  copySecretUrl() {
    const url = this.document?.location?.href ?? '';
    if (!url) return;
    // navegador moderno
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).catch(() => {});
      return;
    }
    // fallback
    const ta = this.document.createElement('textarea');
    ta.value = url;
    this.document.body.appendChild(ta);
    ta.select();
    try { this.document.execCommand('copy'); } catch {}
    this.document.body.removeChild(ta);
  }
}
