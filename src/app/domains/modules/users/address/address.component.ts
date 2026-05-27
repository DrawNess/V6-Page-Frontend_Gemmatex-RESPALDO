import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { catchError, of } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ProfileService } from '@shared/services/profile.service';
import { ClientProfile } from '@shared/models/auth.model';

const BOLIVIA_DEPARTAMENTOS = [
  'La Paz',
  'Cochabamba',
  'Santa Cruz',
  'Oruro',
  'Potosí',
  'Chuquisaca',
  'Tarija',
  'Beni',
  'Pando',
];

/**
 * Edición de la dirección del cliente.
 *
 * Los campos viven en `client_profiles` del SSO. Acá editamos vía
 * `PATCH /auth/me`. Mantenemos los nombres snake_case del backend en los
 * `formControlName` para evitar mapeos extras.
 */
@Component({
  selector: 'app-address',
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './address.component.html',
  styleUrl: './address.component.css',
})
export class AddressComponent implements OnInit {
  readonly accountPath = `/${ROUTE_CONSTANTS.USER.BASE}`;
  readonly departamentos = BOLIVIA_DEPARTAMENTOS;

  loading = false;
  saving = false;
  errorMsg = '';
  successMsg = '';
  modalOpen = false;
  modalTitle = '';
  modalText = '';
  modalType: 'success' | 'error' = 'success';

  form = this.fb.nonNullable.group({
    departamento: this.fb.nonNullable.control<string>(''),
    provincia: [''],
    ciudad: [''],
    calle_avenida: [''],
    numero: [''],
    casa_dpto: [''],
    link_google_maps: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly profileService: ProfileService
  ) {}

  ngOnInit(): void {
    this.loadAddress();
  }

  loadAddress(): void {
    this.loading = true;
    this.errorMsg = '';
    this.successMsg = '';

    this.profileService
      .getMeDetails()
      .pipe(
        catchError(() => of({ user: null, customer: null })),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (details) => {
          const profile =
            (details.user as { clientProfile?: ClientProfile | null } | null)
              ?.clientProfile ?? null;
          this.applyProfileToForm(profile);
        },
        error: () => {
          this.errorMsg = 'No se pudo cargar tu dirección.';
        },
      });
  }

  private applyProfileToForm(p: ClientProfile | null): void {
    this.form.patchValue({
      departamento: p?.departamento ?? '',
      provincia: p?.provincia ?? '',
      ciudad: p?.ciudad ?? '',
      calle_avenida: p?.calle_avenida ?? '',
      numero: p?.numero ?? '',
      casa_dpto: p?.casa_dpto ?? '',
      link_google_maps: p?.link_google_maps ?? '',
    });
  }

  saveAddress(): void {
    this.errorMsg = '';
    this.successMsg = '';

    const raw = this.form.getRawValue();
    const toNullable = (v: string): string | null => (v && v.trim() ? v.trim() : null);

    const payload = {
      departamento: toNullable(raw.departamento),
      provincia: toNullable(raw.provincia),
      ciudad: toNullable(raw.ciudad),
      calle_avenida: toNullable(raw.calle_avenida),
      numero: toNullable(raw.numero),
      casa_dpto: toNullable(raw.casa_dpto),
      link_google_maps: toNullable(raw.link_google_maps),
    };

    const hasAnyValue = Object.values(payload).some((v) => v !== null);
    if (!hasAnyValue) {
      this.openModal(
        'error',
        'Falta información',
        'Completa al menos un campo de tu dirección.'
      );
      return;
    }

    this.saving = true;
    this.profileService
      .updateMe(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (details) => {
          const profile =
            (details.user as { clientProfile?: ClientProfile | null } | null)
              ?.clientProfile ?? null;
          this.applyProfileToForm(profile);
          this.successMsg = 'Dirección guardada.';
          this.openModal(
            'success',
            'Dirección guardada',
            'Actualizamos tu libreta de dirección.'
          );
        },
        error: (err) => {
          this.errorMsg = this.extractErr(err);
          this.openModal('error', 'No se guardó', this.errorMsg);
        },
      });
  }

  private extractErr(err: unknown): string {
    const e = err as { error?: { message?: string; details?: Array<{ message?: string }> } };
    if (e?.error?.message) return e.error.message;
    if (Array.isArray(e?.error?.details) && e.error!.details.length) {
      return e
        .error!.details.map((d) => d.message)
        .filter(Boolean)
        .join(' · ');
    }
    return 'Revisa los datos e inténtalo nuevamente.';
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
