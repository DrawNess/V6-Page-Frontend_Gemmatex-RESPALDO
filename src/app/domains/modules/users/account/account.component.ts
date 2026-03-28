import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { AuthService } from '@shared/services/auth.service';
import { UserService } from '@shared/services/user.service';
import { CustomerService } from '@shared/services/customer.service';
import { ApiCustomer, ApiUser } from '@shared/models/user-portal.model';
import { catchError, forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-account',
  imports: [CommonModule, RouterLink],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
})
export class AccountComponent implements OnInit {
  readonly userBasePath = `/${ROUTE_CONSTANTS.USER.BASE}`;
  readonly userInfoPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.INFO}`;
  readonly userOrdersPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.ORDERS}`;

  navOpen = false;
  navItems = [
    { label: 'Resumen', path: this.userBasePath, description: 'Panel principal' },
    { label: 'Información', path: this.userInfoPath, description: 'Datos y contacto' },
    { label: 'Dirección', path: `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.ADDRESS}`, description: 'Dirección de entrega' },
    { label: 'Pedidos', path: this.userOrdersPath, description: 'Historial y seguimiento' },
  ];

  loading = false;
  user: ApiUser | null = null;
  customer: ApiCustomer | null = null;
  errorMsg = '';

  constructor(
    private readonly userService: UserService,
    private readonly customerService: CustomerService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadAccountSummary();
  }

  loadAccountSummary(): void {
    this.loading = true;
    this.errorMsg = '';

    forkJoin({
      user: this.userService.getCurrentUser().pipe(catchError(() => of(null))),
      customer: this.customerService.getMyCustomer().pipe(catchError(() => of(null))),
    }).pipe(
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: ({ user, customer }) => {
        this.user = user;
        this.customer = customer;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar tu sesión. Inicia sesión nuevamente.';
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

  toggleNav(): void {
    this.navOpen = !this.navOpen;
  }

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/');
  }

  getCustomerFullName(): string {
    const fullName = `${this.customer?.name ?? ''} ${this.customer?.lastName ?? ''}`.trim();
    return fullName || 'Cliente';
  }

  getInitials(): string {
    const name = `${this.customer?.name ?? ''} ${this.customer?.lastName ?? ''}`.trim();
    if (!name) return 'CL';
    return name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0]?.toUpperCase())
      .join('');
  }

  maskedRole(): string {
    return this.user?.role === 'admin' ? 'Admin' : 'Cliente';
  }

}
