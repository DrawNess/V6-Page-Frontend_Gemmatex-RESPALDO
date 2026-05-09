import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { filter } from 'rxjs/operators';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { AuthService } from '@shared/services/auth.service';
import { UserService } from '@shared/services/user.service';
import { CustomerService } from '@shared/services/customer.service';
import { ApiCustomer, ApiUser } from '@shared/models/user-portal.model';

@Component({
  selector: 'app-user-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './user-sidebar.component.html',
})
export class UserSidebarComponent implements OnInit {
  user: ApiUser | null = null;
  customer: ApiCustomer | null = null;
  isOpen = false;

  private readonly base = `/${ROUTE_CONSTANTS.USER.BASE}`;

  readonly navItems = [
    { label: 'Resumen',     path: this.base,                                                              description: 'Panel principal' },
    { label: 'Información', path: `${this.base}/${ROUTE_CONSTANTS.USER.INFO}`,                            description: 'Datos y contacto' },
    { label: 'Dirección',   path: `${this.base}/${ROUTE_CONSTANTS.USER.ADDRESS}`,                         description: 'Dirección de entrega' },
    { label: 'Pedidos',     path: `${this.base}/${ROUTE_CONSTANTS.USER.ORDERS}`,                          description: 'Historial y seguimiento' },
  ];

  constructor(
    private readonly userService: UserService,
    private readonly customerService: CustomerService,
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    forkJoin({
      user: this.userService.getCurrentUser().pipe(catchError(() => of(null))),
      customer: this.customerService.getMyCustomer().pipe(catchError(() => of(null))),
    }).subscribe(({ user, customer }) => {
      this.user = user;
      this.customer = customer;
    });

    // cierra drawer al navegar
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe(() => { this.isOpen = false; });
  }

  open(): void  { this.isOpen = true; }
  close(): void { this.isOpen = false; }

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/');
  }

  getInitials(): string {
    const name = `${this.customer?.name ?? ''} ${this.customer?.lastName ?? ''}`.trim();
    if (!name) return 'CL';
    return name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]?.toUpperCase()).join('');
  }

  getFullName(): string {
    return `${this.customer?.name ?? ''} ${this.customer?.lastName ?? ''}`.trim() || 'Cliente';
  }

  maskedRole(): string {
    const roles = this.user?.roles ?? (this.user?.role ? [this.user.role] : []);
    return roles.includes('admin') ? 'Admin' : 'Cliente';
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
