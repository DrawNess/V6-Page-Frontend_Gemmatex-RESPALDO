import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { catchError, forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { AuthService } from '@shared/services/auth.service';
import { CustomerService } from '@shared/services/customer.service';
import { UserService } from '@shared/services/user.service';
import { ApiCustomer, ApiUser } from '@shared/models/user-portal.model';
import { ProfileService } from '@shared/services/profile.service';

type NullableCustomer = ApiCustomer | null;

@Component({
  selector: 'app-info-account',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './info-account.component.html',
  styleUrl: './info-account.component.css',
})
export class InfoAccountComponent implements OnInit {
  readonly accountPath = `/${ROUTE_CONSTANTS.USER.BASE}`;

  loading = false;
  saving = false;
  user: ApiUser | null = null;
  customer: ApiCustomer | null = null;
  errorMsg = '';
  successMsg = '';
  passwordMsg = '';
  passwordLoading = false;

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
    private readonly profileService: ProfileService,
    private readonly authService: AuthService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.profileService.getMeDetails().pipe(
      catchError(() =>
        forkJoin([
          this.userService.getCurrentUser(),
          this.customerService.getCurrentCustomer().pipe(catchError(() => of(null))),
        ])
      ),
      finalize(() => (this.loading = false))
    ).subscribe({
      next: (response) => {
        const [user, customer] = Array.isArray(response)
          ? (response as [ApiUser, NullableCustomer])
          : [response.user, response.customer];

        this.user = user;
        this.customer = customer;

        this.form.patchValue({
          email: user.email ?? '',
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
      email: email.trim().toLowerCase(),
      name: name.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
    };

    this.saving = true;

    this.profileService.updateMe(updatePayload).pipe(
      catchError(() => {
        const userRequest$ = this.userService.updateUser(this.user!.id, {
          email: updatePayload.email,
        });
        const customerRequest$ = this.customer
          ? this.customerService
              .updateCustomer(this.customer.id, {
                name: updatePayload.name,
                lastName: updatePayload.lastName,
                phone: updatePayload.phone,
              })
              .pipe(catchError(() => of(null)))
          : of(null);
        return forkJoin([userRequest$, customerRequest$]);
      }),
      finalize(() => (this.saving = false))
    ).subscribe({
      next: (response) => {
        if (Array.isArray(response)) {
          const [updatedUser, updatedCustomer] = response as [ApiUser, NullableCustomer];
          this.user = updatedUser;
          this.customer = updatedCustomer ?? this.customer;
        } else {
          this.user = response.user;
          this.customer = response.customer;
        }
        this.successMsg = 'Datos actualizados correctamente.';
      },
      error: () => {
        this.errorMsg = 'No se pudieron guardar los cambios. Verifica los datos e intenta nuevamente.';
      },
    });
  }

  sendPasswordRecovery(): void {
    this.passwordMsg = '';
    const email = this.form.controls.email.value.trim().toLowerCase();
    if (!email) {
      this.passwordMsg = 'No hay correo disponible para enviar recuperación.';
      return;
    }

    this.passwordLoading = true;
    this.authService.recoverPassword(email).pipe(
      finalize(() => (this.passwordLoading = false))
    ).subscribe({
      next: () => {
        this.passwordMsg = 'Te enviamos un correo para cambiar tu contraseña.';
      },
      error: () => {
        this.passwordMsg = 'No se pudo iniciar la recuperación. Intenta nuevamente.';
      },
    });
  }

}
