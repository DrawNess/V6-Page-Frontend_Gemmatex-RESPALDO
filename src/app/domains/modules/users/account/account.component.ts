import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ProfileService } from '@shared/services/profile.service';
import { ApiUser } from '@shared/models/user-portal.model';
import { ClientProfile } from '@shared/models/auth.model';
import { catchError, of } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'app-account',
  imports: [RouterLink],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
})
export class AccountComponent implements OnInit {
  readonly userInfoPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.INFO}`;
  readonly userOrdersPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.ORDERS}`;

  loading = false;
  user: ApiUser | null = null;
  profile: ClientProfile | null = null;
  errorMsg = '';

  constructor(private readonly profileService: ProfileService) {}

  ngOnInit(): void {
    this.loading = true;
    this.profileService
      .getMeDetails()
      .pipe(
        catchError(() => of({ user: null, customer: null })),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: (details) => {
          this.user = (details.user as ApiUser) ?? null;
          this.profile =
            (details.user as (ApiUser & { clientProfile?: ClientProfile | null }) | null)
              ?.clientProfile ?? null;
        },
        error: () => {
          this.errorMsg = 'No se pudo cargar tu sesión. Inicia sesión nuevamente.';
        },
      });
  }

  get fullName(): string {
    if (!this.profile) return '';
    const parts = [this.profile.first_name, this.profile.last_name].filter(Boolean);
    return parts.join(' ').trim();
  }

  get roleLabel(): string {
    const roles = this.user?.roles ?? [];
    if (roles.includes('super_admin')) return 'Super Administrador';
    if (roles.includes('admin')) return 'Administrador';
    if (roles.includes('staff')) return 'Staff';
    if (roles.includes('client')) return 'Cliente';
    return '—';
  }

  get documentLabel(): string {
    if (!this.profile?.document_number) return '—';
    return `${this.profile.document_type ?? ''} ${this.profile.document_number}`.trim();
  }

  get birthLabel(): string {
    if (!this.profile?.birth_date) return '—';
    try {
      // birth_date llega como YYYY-MM-DD desde el SSO. Lo formateamos a
      // dd/mm/yyyy en local sin riesgo de cambio por timezone.
      const [y, m, d] = this.profile.birth_date.split('-').map(Number);
      const date = new Date(y, (m ?? 1) - 1, d ?? 1);
      return date.toLocaleDateString('es-BO', { year: 'numeric', month: '2-digit', day: '2-digit' });
    } catch {
      return this.profile.birth_date;
    }
  }

  get addressLine(): string {
    if (!this.profile) return '—';
    const parts = [
      this.profile.calle_avenida,
      this.profile.numero,
      this.profile.casa_dpto,
      this.profile.ciudad,
      this.profile.provincia,
      this.profile.departamento,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : '—';
  }

  get verifiedLabel(): string {
    return this.user?.email_verified_at ? 'Verificado' : 'Sin verificar';
  }
}
