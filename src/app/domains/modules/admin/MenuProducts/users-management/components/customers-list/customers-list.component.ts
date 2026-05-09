import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiCustomer } from '@shared/models/user-portal.model';
import { CustomerService } from '@shared/services/customer.service';

@Component({
  selector: 'app-customers-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-list.component.html',
})
export class CustomersListComponent {
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);

  private readonly basePath = `/${ROUTE_CONSTANTS.SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.USERS}/customers`;

  readonly customers = signal<ApiCustomer[]>([]);
  readonly loading = signal(false);
  readonly errorMsg = signal('');
  readonly query = signal('');

  queryCustomerId: number | null = null;

  readonly filtered = computed(() => {
    const q = this.query().trim().toLowerCase();
    if (!q) return this.customers();
    return this.customers().filter(c => {
      const name = `${c.name ?? ''} ${c.lastName ?? ''}`.toLowerCase();
      const email = (c.email ?? c.user?.email ?? '').toLowerCase();
      return name.includes(q) || email.includes(q) || String(c.id).includes(q);
    });
  });

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.customerService.getCustomers().subscribe({
      next: (cs) => { this.customers.set(cs); this.loading.set(false); },
      error: () => { this.errorMsg.set('No se pudo cargar clientes.'); this.loading.set(false); },
    });
  }

  goById(): void {
    const id = Number(this.queryCustomerId);
    if (!Number.isInteger(id) || id <= 0) {
      this.errorMsg.set('ID inválido.');
      return;
    }
    this.openProfile(id);
  }

  openProfile(customerId: number): void {
    this.router.navigate([this.basePath, customerId]);
  }

  trackById = (_: number, c: ApiCustomer) => c.id;
}
