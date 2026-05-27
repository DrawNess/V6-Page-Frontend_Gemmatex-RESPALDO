import { Component, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { finalize } from 'rxjs/operators';

import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ProfileService } from '@shared/services/profile.service';
import { AuthService } from '@shared/services/auth.service';
import { ApiUser } from '@shared/models/user-portal.model';
import { ClientProfile } from '@shared/models/auth.model';

@Component({
  selector: 'app-info-account',
  imports: [NgClass, ReactiveFormsModule],
  templateUrl: './info-account.component.html',
  styleUrl: './info-account.component.css',
})
export class InfoAccountComponent implements OnInit {
  readonly accountPath = `/${ROUTE_CONSTANTS.USER.BASE}`;

  loading = false;
  saving = false;
  user: ApiUser | null = null;
  profile: ClientProfile | null = null;
  errorMsg = '';
  successMsg = '';
  passwordLoading = false;
  modalOpen = false;
  modalTitle = '';
  modalText = '';
  modalType: 'success' | 'error' = 'success';

  /**
   * Formulario unificado de perfil del cliente, espejo de la tabla
   * `client_profiles` del SSO (snake_case en el payload, camelCase / kebab
   * en los formControlName para alinear con la nomenclatura UI). El backend
   * SSO recibe los campos en snake_case via `PATCH /auth/me`.
   */
  form = this.fb.nonNullable.group({
    email: [{ value: '', disabled: true }, [Validators.required, Validators.email]],
    first_name: ['', [Validators.required, Validators.minLength(2)]],
    last_name: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.pattern(/^\+591\d{8}$/)]],
    document_type: this.fb.nonNullable.control<'' | 'CI' | 'NIT'>(''),
    document_number: [''],
    razon_social: [''],
    birth_date: [''],
  });

  constructor(
    private readonly fb: FormBuilder,
    private readonly profileService: ProfileService,
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

    this.profileService
      .getMeDetails()
      .pipe(
        catchError(() => of({ user: null, customer: null })),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (details) => {
          const user = (details.user as ApiUser & { clientProfile?: ClientProfile | null }) ?? null;
          this.user = user;
          this.profile = user?.clientProfile ?? null;
          this.applyProfileToForm();
        },
        error: () => {
          this.errorMsg = 'No se pudo cargar tu información de cuenta.';
        },
      });
  }

  private applyProfileToForm(): void {
    const p = this.profile;
    this.form.patchValue({
      email: this.user?.email ?? '',
      first_name: p?.first_name ?? '',
      last_name: p?.last_name ?? '',
      phone: p?.phone ?? '',
      document_type: (p?.document_type as '' | 'CI' | 'NIT') ?? '',
      document_number: p?.document_number ?? '',
      razon_social: p?.razon_social ?? '',
      birth_date: p?.birth_date ?? '',
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

    const raw = this.form.getRawValue();

    // Pasa al SSO snake_case. Strings vacíos se traducen a null para que el
    // backend efectivamente "limpie" el campo (ej. al borrar el NIT).
    const toNullable = (v: string): string | null => (v && v.trim() ? v.trim() : null);

    const payload = {
      name: raw.first_name.trim(),
      lastName: raw.last_name.trim(),
      phone: raw.phone.trim(),
      document_type: raw.document_type === '' ? null : raw.document_type,
      document_number: toNullable(raw.document_number),
      razon_social: toNullable(raw.razon_social),
      birth_date: toNullable(raw.birth_date),
    };

    if (payload.document_type === 'NIT' && !payload.razon_social) {
      this.openModal(
        'error',
        'Falta razón social',
        'Si tu documento es NIT debes completar la razón social.'
      );
      return;
    }

    this.saving = true;
    this.profileService
      .updateMe(payload)
      .pipe(finalize(() => (this.saving = false)))
      .subscribe({
        next: (details) => {
          const user = details.user as ApiUser & { clientProfile?: ClientProfile | null };
          this.user = user;
          this.profile = user?.clientProfile ?? this.profile;
          this.applyProfileToForm();
          this.successMsg = 'Datos actualizados correctamente.';
          this.openModal(
            'success',
            'Cambios guardados',
            'Actualizamos tu información. Si no lo solicitaste, contacta soporte.'
          );
        },
        error: (err) => {
          this.errorMsg = this.extractErr(err);
          this.openModal('error', 'No se guardó', this.errorMsg);
        },
      });
  }

  goToPasswordRecovery(): void {
    const email = this.user?.email ?? this.form.getRawValue().email?.trim().toLowerCase();
    if (!email) {
      this.openModal('error', 'No se puede enviar', 'No hay correo disponible para enviar recuperación.');
      return;
    }

    this.passwordLoading = true;
    this.authService
      .recoverPassword(email)
      .pipe(finalize(() => (this.passwordLoading = false)))
      .subscribe({
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

  private extractErr(err: unknown): string {
    const e = err as { error?: { message?: string; details?: Array<{ message?: string }> } };
    if (e?.error?.message) return e.error.message;
    if (Array.isArray(e?.error?.details) && e.error!.details.length) {
      return e
        .error!.details.map((d) => d.message)
        .filter(Boolean)
        .join(' · ');
    }
    return 'No se pudieron guardar los cambios. Verifica los datos e intenta nuevamente.';
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
