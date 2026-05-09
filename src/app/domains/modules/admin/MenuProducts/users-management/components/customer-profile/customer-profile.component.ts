import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiCustomer } from '@shared/models/user-portal.model';
import { CustomerService } from '@shared/services/customer.service';

@Component({
  selector: 'app-customer-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './customer-profile.component.html',
})
export class CustomerProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly customerService = inject(CustomerService);

  private readonly basePath = `/${ROUTE_CONSTANTS.SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.USERS}/customers`;

  readonly customer = signal<ApiCustomer | null>(null);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly deleting = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');

  editName = '';
  editLastName = '';
  editPhone = '';

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('customerId'));
      if (Number.isInteger(id) && id > 0) {
        this.fetch(id);
      }
    });
  }

  fetch(id: number): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.customerService.getCustomerById(id).subscribe({
      next: (c) => {
        this.customer.set(c);
        this.editName = c.name ?? '';
        this.editLastName = c.lastName ?? '';
        this.editPhone = c.phone ?? '';
        this.loading.set(false);
      },
      error: () => { this.errorMsg.set('No se pudo cargar cliente.'); this.loading.set(false); },
    });
  }

  back(): void {
    this.router.navigate([this.basePath]);
  }

  ordersUrl(): string[] {
    const c = this.customer();
    return c ? [this.basePath, String(c.id), 'orders'] : [this.basePath];
  }

  save(): void {
    const c = this.customer();
    if (!c?.id) return;
    const name = this.editName.trim();
    const lastName = this.editLastName.trim();
    const phone = this.editPhone.trim();
    if (!name || !lastName) { this.errorMsg.set('Nombre y apellido obligatorios.'); return; }

    const payload: Partial<Pick<ApiCustomer, 'name' | 'lastName' | 'phone'>> = {};
    if (name !== c.name) payload.name = name;
    if (lastName !== c.lastName) payload.lastName = lastName;
    if (phone !== (c.phone ?? '')) payload.phone = phone;

    if (!Object.keys(payload).length) { this.successMsg.set('Sin cambios.'); return; }

    this.saving.set(true);
    this.errorMsg.set('');
    this.customerService.updateCustomer(c.id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.customer.set(updated);
        this.successMsg.set('Guardado.');
      },
      error: () => { this.saving.set(false); this.errorMsg.set('No se pudo guardar.'); },
    });
  }

  delete(): void {
    const c = this.customer();
    if (!c?.id) return;
    this.deleting.set(true);
    this.errorMsg.set('');
    this.customerService.deleteCustomer(c.id).subscribe({
      next: () => { this.deleting.set(false); this.back(); },
      error: () => { this.deleting.set(false); this.errorMsg.set('No se pudo eliminar.'); },
    });
  }
}
