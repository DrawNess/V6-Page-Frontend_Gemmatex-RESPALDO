import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { CustomerService } from '@shared/services/customer.service';
import { UserService } from '@shared/services/user.service';
import { ApiCustomer, ApiUser } from '@shared/models/user-portal.model';
import { AuthService } from '@shared/services/auth.service';

type NullableCustomer = ApiCustomer | null;
type CustomerWithEmail = ApiCustomer & { email?: string };

@Component({
  selector: 'app-info-account',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './info-account.component.html',
  styleUrl: './info-account.component.css',
})
export class InfoAccountComponent implements OnInit {
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
  navOpen = false;
  user: ApiUser | null = null;
  customer: ApiCustomer | null = null;
  errorMsg = '';
  successMsg = '';
  passwordLoading = false;
  modalOpen = false;
  modalTitle = '';
  modalText = '';
  modalType: 'success' | 'error' = 'success';

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    name: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(7)]],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly userService: UserService,
    private readonly customerService: CustomerService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    forkJoin<[NullableCustomer, ApiUser | null]>([
      this.customerService.getMyCustomer().pipe(catchError(() => of(null as NullableCustomer))),
      this.userService.getCurrentUser().pipe(catchError(() => of(null as ApiUser | null))),
    ]).pipe(
      finalize(() => (this.loading = false))
    ).subscribe({
      next: ([customer, user]) => {
        this.user = user;
        this.customer = customer;

        this.form.patchValue({
          email: (customer as CustomerWithEmail)?.email ?? user?.email ?? '',
          name: customer?.name ?? '',
          lastName: customer?.lastName ?? '',
          phone: customer?.phone ?? '',
        });
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar tu información de cuenta.';
      },
    });
  }

  toggleNav(): void {
    this.navOpen = !this.navOpen;
  }

  isActive(path: string): boolean {
    return this.router.url === path || this.router.url.startsWith(path + '/');
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

  getCustomerFullName(): string {
    const fullName = `${this.customer?.name ?? ''} ${this.customer?.lastName ?? ''}`.trim();
    return fullName || 'Cliente';
  }

  saveChanges(): void {
    this.errorMsg = '';
    this.successMsg = '';

    if (!this.user) {
      this.errorMsg = 'No se encontró un usuario autenticado.';
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, name, lastName, phone } = this.form.getRawValue();
    const updatePayload = {
      name: name.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    };

    this.saving = true;

    this.customerService.updateMyCustomer(updatePayload).pipe(
      finalize(() => (this.saving = false))
    ).subscribe({
      next: (updatedCustomer: CustomerWithEmail) => {
        this.customer = updatedCustomer ?? this.customer;

        // Refresca el formulario con los datos finales
        this.form.patchValue({
          email: updatedCustomer?.email ?? this.user?.email ?? email,
          name: this.customer?.name ?? '',
          lastName: this.customer?.lastName ?? '',
          phone: this.customer?.phone ?? '',
        });
        this.successMsg = 'Datos actualizados correctamente.';
        this.openModal(
          'success',
          'Cambios guardados',
          'Actualizamos tu nombre y teléfono. Si no lo solicitaste, contacta soporte.'
        );
      },
      error: () => {
        this.errorMsg = 'No se pudieron guardar los cambios. Verifica los datos e intenta nuevamente.';
        this.openModal(
          'error',
          'No se guardó',
          'Revisa los datos e inténtalo de nuevo. Si persiste, contacta soporte.'
        );
      },
    });
  }

  goToPasswordRecovery(): void {
    const email = this.form.getRawValue().email?.trim().toLowerCase();
    if (!email) {
      this.openModal('error', 'No se puede enviar', 'No hay correo disponible para enviar recuperación.');
      return;
    }

    this.passwordLoading = true;
    this.authService.recoverPassword(email).pipe(
      finalize(() => (this.passwordLoading = false))
    ).subscribe({
      next: () => {
        this.openModal(
          'success',
          'Correo enviado',
          'Te enviamos un enlace para restablecer tu contraseña. Revisa tu bandeja y spam.'
        );
      },
      error: () => {
        this.openModal(
          'error',
          'No se pudo enviar',
          'Intenta nuevamente o contacta soporte si el problema persiste.'
        );
      },
    });
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
