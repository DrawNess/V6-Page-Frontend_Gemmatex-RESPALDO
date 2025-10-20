import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
const SECRET_BASE = 'admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21';

type LinkItem = { to: string; label: string; desc: string; emoji?: string };
@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {

  // Catálogo
  linksCatalog = signal<LinkItem[]>([
    { to: `/${SECRET_BASE}/categories`,     label: 'Categorías',     desc: 'Crear/gestionar categorías',       emoji: '🗂️' },
    { to: `/${SECRET_BASE}/subcategories`,  label: 'Subcategorías',  desc: 'Asociadas a una categoría',        emoji: '🧩' },
    { to: `/${SECRET_BASE}/products`,       label: 'Productos',      desc: 'Crear productos del catálogo',     emoji: '📦' },
  ]);

  // Publicidad (home)
  linksAds = signal<LinkItem[]>([
    { to: `/${SECRET_BASE}/menu-adds`,                 label: 'Panel de Publicidad', desc: 'Vista general de anuncios',    emoji: '🧭' },
    { to: `/${SECRET_BASE}/menu-adds/hero-slides`,     label: 'Hero Slides',         desc: 'Slides del hero (desktop/móvil)', emoji: '🖼️' },
    { to: `/${SECRET_BASE}/menu-adds/offers-adds`,     label: 'Announcements',       desc: 'Barra superior / anuncios',    emoji: '📢' },
    { to: `/${SECRET_BASE}/menu-adds/promo`,           label: 'Promos',              desc: 'Tarjetas de promociones',      emoji: '🏷️' },
  ]);

  trackByTo = (_: number, i: LinkItem) => i.to;
}
