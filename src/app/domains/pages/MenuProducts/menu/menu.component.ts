import { Component, inject, DOCUMENT } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

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

  // --- Catálogo
  private catalogLinks: MenuLink[] = [
    { to: ['/admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21','offers-menu'],    label: 'Ofertas',      desc: 'Añadir Ofertas.', icon: 'ticket' },
    { to: ['/admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21','categories'],    label: 'Categorías',     desc: 'Crea, edita u ordena categorías.',                   icon: 'grid' },
    { to: ['/admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21','subcategories'], label: 'Subcategorías',  desc: 'Gestiona subniveles por categoría.',                icon: 'layers' },
    { to: ['/admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21','products'],      label: 'Productos',      desc: 'Alta rápida, stock y precios por SKU.',             icon: 'box' },
  ];

  // --- Publicidad Home
  private adsLinks: MenuLink[] = [
    /* { to: ['/admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21','menu-adds'],             label: 'Panel de publicidad', desc: 'Accesos a todos los módulos de home.',   icon: 'megaphone' }, */
    { to: ['/admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21','menu-adds','hero-slides'],label: 'Hero Slides',         desc: 'Banners principales (desktop/móvil).',   icon: 'image' },
    { to: ['/admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21','menu-adds','offers-adds'],label: 'Announcements',        desc: 'Avisos/avisos tipo chip en el header.',  icon: 'megaphone' },
    { to: ['/admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21','menu-adds','promo'],      label: 'Promos',               desc: 'Slider de promociones secundarias.',     icon: 'tags' },
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
