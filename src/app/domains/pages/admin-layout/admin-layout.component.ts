import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { TokenService } from '@shared/services/token.service';
import { AuthService } from '@shared/services/auth.service';

type NavItem = { label: string; path: string[]; exact?: boolean };
type NavSection = { title: string; items: NavItem[]; svgPath: string };

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet],
  templateUrl: './admin-layout.component.html',
  styleUrl: './admin-layout.component.css',
})
export class AdminLayoutComponent {
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  private router = inject(Router);

  readonly sidebarOpen = signal(false);

  private readonly base = `/${ROUTE_CONSTANTS.SECRET_BASE}`;

  readonly adminRole = this.tokenService.getRoleFromToken() ?? 'admin';
  readonly adminEmail = this.getEmailFromToken();

  readonly nav: NavSection[] = [
    {
      title: 'Catálogo',
      svgPath: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
      items: [
        { label: 'Productos',     path: [this.base, ROUTE_CONSTANTS.ADMIN.PRODUCTS] },
        { label: 'Categorías',    path: [this.base, ROUTE_CONSTANTS.ADMIN.CATEGORIES] },
        { label: 'Subcategorías', path: [this.base, ROUTE_CONSTANTS.ADMIN.SUBCATEGORIES] },
        { label: 'Ofertas',       path: [this.base, ROUTE_CONSTANTS.ADMIN.OFFERS_MENU] },
      ],
    },
    {
      title: 'Publicidad',
      svgPath: 'M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z',
      items: [
        { label: 'Hero Slides', path: [this.base, ROUTE_CONSTANTS.ADMIN.HERO_SLIDES] },
        { label: 'Anuncios',    path: [this.base, ROUTE_CONSTANTS.ADMIN.OFFERS_ADDS] },
        { label: 'Promos',      path: [this.base, ROUTE_CONSTANTS.ADMIN.PROMO] },
      ],
    },
    {
      title: 'Pedidos',
      svgPath: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01',
      items: [
        { label: 'Control de Pedidos', path: [this.base, ROUTE_CONSTANTS.ADMIN.ORDERS_ADMIN] },
        { label: 'Por Cliente',        path: [this.base, ROUTE_CONSTANTS.ADMIN.ORDERS_BY_CUSTOMER] },
      ],
    },
    {
      title: 'Usuarios',
      svgPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z',
      items: [
        { label: 'Administrar Usuarios', path: [this.base, ROUTE_CONSTANTS.ADMIN.USERS] },
      ],
    },
  ];

  toggleSidebar() { this.sidebarOpen.update(v => !v); }
  closeSidebar()  { this.sidebarOpen.set(false); }

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
