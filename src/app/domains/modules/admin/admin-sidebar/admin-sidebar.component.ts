import { Component, inject, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { TokenService } from '@shared/services/token.service';
import { AuthService } from '@shared/services/auth.service';

type NavItem = { label: string; path: string[]; icon: string };
type NavSection = { title: string; items: NavItem[]; svgPath: string };

@Component({
  selector: 'app-admin-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './admin-sidebar.component.html',
  styleUrl: './admin-sidebar.component.css',
})
export class AdminSidebarComponent {
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  private router = inject(Router);

  /** Desktop: sidebar expandido o colapsado */
  collapsed = input<boolean>(false);

  /** Movil: sidebar abierto como overlay */
  mobileOpen = input<boolean>(false);

  /** Emite para cerrar en movil */
  closed = output<void>();

  /** Emite para toggle en desktop */
  toggled = output<void>();

  private readonly base = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  readonly adminRole = this.tokenService.getRoleFromToken() ?? 'admin';
  readonly adminEmail = this.getEmailFromToken();
  readonly adminInitials = String(this.adminEmail).charAt(0).toUpperCase();

  readonly nav: NavSection[] = [
    {
      title: 'Catálogo',
      svgPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      items: [
        { label: 'Productos',     path: [this.base, ROUTE_CONSTANTS.ADMIN.PRODUCTS],       icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
        { label: 'Categorías',    path: [this.base, ROUTE_CONSTANTS.ADMIN.CATEGORIES],      icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z' },
        { label: 'Subcategorías', path: [this.base, ROUTE_CONSTANTS.ADMIN.SUBCATEGORIES],   icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
        { label: 'Ofertas',       path: [this.base, ROUTE_CONSTANTS.ADMIN.OFFERS_MENU],     icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
        { label: 'Carga Masiva', path: [this.base, ROUTE_CONSTANTS.ADMIN.BULK_UPLOAD],    icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
      ],
    },
    {
      title: 'Publicidad',
      svgPath: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
      items: [
        { label: 'Hero Slides', path: [this.base, ...ROUTE_CONSTANTS.ADMIN.HERO_SLIDES.split('/')],  icon: 'M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' },
        { label: 'Anuncios',    path: [this.base, ...ROUTE_CONSTANTS.ADMIN.OFFERS_ADDS.split('/')],  icon: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9' },
        { label: 'Promos',      path: [this.base, ...ROUTE_CONSTANTS.ADMIN.PROMO.split('/')],         icon: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z' },
      ],
    },
    {
      title: 'Pedidos',
      svgPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      items: [
        { label: 'Control de Pedidos', path: [this.base, ROUTE_CONSTANTS.ADMIN.ORDERS_ADMIN],       icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
        { label: 'Por Cliente',        path: [this.base, ROUTE_CONSTANTS.ADMIN.ORDERS_BY_CUSTOMER], icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
      ],
    },
    {
      title: 'Usuarios',
      svgPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { label: 'Administrar Usuarios', path: [this.base, ROUTE_CONSTANTS.ADMIN.USERS], icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
      ],
    },
  ];

  closeSidebar() {
    this.closed.emit();
  }

  toggle() {
    this.toggled.emit();
  }

  logout() {
    this.authService.logout();
    void this.router.navigate(['/auth/login']);
  }

  private getEmailFromToken(): string {
    const token = this.tokenService.getToken();
    if (!token) return 'Administrador';
    try {
      const b64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(b64 + '='.repeat((4 - b64.length % 4) % 4)));
      return payload.email ?? payload.sub ?? 'Administrador';
    } catch { return 'Administrador'; }
  }
}
