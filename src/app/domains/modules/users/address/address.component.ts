import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CustomerService } from '@shared/services/customer.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiCustomer } from '@shared/models/user-portal.model';

@Component({
  selector: 'app-address',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './address.component.html',
  styleUrl: './address.component.css',
})
export class AddressComponent implements OnInit {
  readonly accountPath = `/${ROUTE_CONSTANTS.USER.BASE}`;
  readonly userInfoPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.INFO}`;
  readonly userOrdersPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.ORDERS}`;
  readonly userAddressPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.ADDRESS}`;
  readonly navItems = [
    { label: 'Resumen', path: this.accountPath, description: 'Panel principal' },
    { label: 'Información', path: this.userInfoPath, description: 'Datos y contacto' },
    { label: 'Dirección', path: this.userAddressPath, description: 'Dirección de entrega' },
    { label: 'Pedidos', path: this.userOrdersPath, description: 'Historial y seguimiento' },
  ];

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  modalOpen = false;
  modalTitle = '';
  modalText = '';
  modalType: 'success' | 'error' = 'success';

  form = this.fb.nonNullable.group({
    company: [''],
    region: [''],
    city: [''],
    street: [''],
    streetNumber: [''],
    apartment: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly customerService: CustomerService
  ) {}

  ngOnInit(): void {
    this.loadAddress();
  }

  loadAddress(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.customerService.getMyAddress().subscribe({
      next: (address) => {
        this.form.patchValue({
          company: address?.company ?? '',
          region: address?.region ?? '',
          city: address?.city ?? '',
          street: address?.street ?? '',
          streetNumber: address?.streetNumber ?? '',
          apartment: address?.apartment ?? '',
        });
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.errorMsg = 'No se pudo cargar tu dirección.';
      },
    });
  }

  saveAddress(): void {
    this.errorMsg = '';
    this.successMsg = '';

    const raw = this.form.getRawValue();
    const payload = Object.entries(raw).reduce((acc, [key, value]) => {
      const trimmed = (value ?? '').toString().trim();
      if (trimmed) acc[key as keyof ApiCustomer] = trimmed;
      return acc;
    }, {} as Record<string, string>);

    if (Object.keys(payload).length === 0) {
      this.openModal('error', 'Falta información', 'Completa al menos un campo de tu dirección.');
      return;
    }

    this.saving = true;
    this.customerService.updateMyAddress(payload).subscribe({
      next: (address) => {
        this.successMsg = 'Dirección actualizada.';
        this.openModal('success', 'Dirección guardada', 'Actualizamos tu libreta de dirección.');
        this.form.patchValue({
          company: address?.company ?? '',
          region: address?.region ?? '',
          city: address?.city ?? '',
          street: address?.street ?? '',
          streetNumber: address?.streetNumber ?? '',
          apartment: address?.apartment ?? '',
        });
        this.saving = false;
      },
      error: () => {
        this.saving = false;
        this.openModal('error', 'No se guardó', 'Revisa los datos e inténtalo nuevamente.');
      },
    });
  }

  isActive(path: string): boolean {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  }

  openModal(type: 'success' | 'error', title: string, text: string): void {
    this.modalType = type;
    this.modalTitle = title;
    this.modalText = text;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.modalOpen = false;
  }

}
