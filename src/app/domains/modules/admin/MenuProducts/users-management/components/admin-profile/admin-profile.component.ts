import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiBranch, ApiRole, ApiUser, ApiUserRole } from '@shared/models/user-portal.model';
import { OrderService } from '@shared/services/order.service';
import { UserService } from '@shared/services/user.service';
import { catchError, of } from 'rxjs';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-profile.component.html',
})
export class AdminProfileComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly userService = inject(UserService);
  private readonly orderService = inject(OrderService);

  private readonly basePath = `/${ROUTE_CONSTANTS.SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.USERS}/admins`;

  readonly user = signal<ApiUser | null>(null);
  readonly userRoles = signal<ApiUserRole[]>([]);
  readonly availableRoles = signal<ApiRole[]>([]);
  readonly branches = signal<ApiBranch[]>([]);

  readonly loading = signal(false);
  readonly rolesLoading = signal(false);
  readonly saving = signal(false);
  readonly assigning = signal(false);
  readonly revokingId = signal<number | null>(null);
  readonly deleting = signal(false);

  readonly errorMsg = signal('');
  readonly successMsg = signal('');

  readonly activeTab = signal<'cuenta' | 'roles'>('cuenta');

  editEmail = '';
  editVerified = false;
  newRoleId: number | null = null;
  newRoleBranchId: number | null = null;

  get selectedRoleNeedsBranch(): boolean {
    const role = this.availableRoles().find(r => r.id === Number(this.newRoleId));
    return role ? ['branch_admin', 'seller'].includes(role.slug) : false;
  }

  constructor() {
    this.route.paramMap.subscribe(params => {
      const id = Number(params.get('userId'));
      if (Number.isInteger(id) && id > 0) {
        this.fetch(id);
      }
    });
    this.userService.getRoles().pipe(catchError(() => of([] as ApiRole[]))).subscribe(roles => {
      this.availableRoles.set(roles);
      if (roles.length > 0 && this.newRoleId === null) this.newRoleId = roles[0].id;
    });
    this.orderService.getBranches().pipe(
      catchError((err) => { console.error('[admin-profile] getBranches error', err); return of([] as ApiBranch[]); })
    ).subscribe(b => {
      console.log('[admin-profile] branches loaded', b);
      this.branches.set(b);
    });
  }

  fetch(id: number): void {
    this.loading.set(true);
    this.errorMsg.set('');
    this.userService.getUserById(id).subscribe({
      next: (u) => {
        this.user.set(u);
        this.editEmail = u.email ?? '';
        this.editVerified = !!u.isEmailVerified;
        this.loading.set(false);
        this.loadRoles(id);
      },
      error: () => { this.errorMsg.set('No se pudo cargar usuario.'); this.loading.set(false); },
    });
  }

  loadRoles(userId: number): void {
    this.rolesLoading.set(true);
    this.userService.getUserRoles(userId).pipe(catchError(() => of([] as ApiUserRole[]))).subscribe(rs => {
      this.userRoles.set(rs);
      this.rolesLoading.set(false);
    });
  }

  back(): void {
    this.router.navigate([this.basePath]);
  }

  save(): void {
    const u = this.user();
    if (!u) return;
    const email = this.editEmail.trim();
    if (!email) { this.errorMsg.set('Email vacío.'); return; }

    const payload: Partial<Pick<ApiUser, 'email' | 'isEmailVerified'>> = {};
    if (email !== u.email) payload.email = email;
    if (this.editVerified !== !!u.isEmailVerified) payload.isEmailVerified = this.editVerified;
    if (!Object.keys(payload).length) {
      this.successMsg.set('Sin cambios.');
      return;
    }

    this.saving.set(true);
    this.errorMsg.set('');
    this.userService.updateUser(u.id, payload).subscribe({
      next: (updated) => {
        this.saving.set(false);
        this.user.set(updated);
        this.editEmail = updated.email ?? email;
        this.editVerified = !!updated.isEmailVerified;
        this.successMsg.set('Guardado.');
      },
      error: () => { this.saving.set(false); this.errorMsg.set('No se pudo guardar.'); },
    });
  }

  assignRole(): void {
    const u = this.user();
    if (!u) return;
    const roleId = Number(this.newRoleId);
    if (!roleId) { this.errorMsg.set('Selecciona rol.'); return; }
    const role = this.availableRoles().find(r => r.id === roleId);
    const needsBranch = role ? ['branch_admin', 'seller'].includes(role.slug) : false;
    const rawBranch = this.newRoleBranchId;
    const branchId = needsBranch ? (Number(rawBranch) || null) : null;
    console.log('[admin-profile] assignRole', { roleId, roleSlug: role?.slug, needsBranch, rawBranch, branchId, branches: this.branches() });
    if (needsBranch && !branchId) {
      this.errorMsg.set(`Rol "${role!.slug}" requiere sucursal.`);
      return;
    }

    this.assigning.set(true);
    this.errorMsg.set('');
    this.userService.assignRole(u.id, { roleId, branchId }).subscribe({
      next: () => {
        this.assigning.set(false);
        this.successMsg.set('Rol asignado.');
        this.loadRoles(u.id);
      },
      error: (err) => {
        this.assigning.set(false);
        this.errorMsg.set(err?.error?.message ?? 'No se pudo asignar.');
      },
    });
  }

  revoke(userRoleId: number): void {
    const u = this.user();
    if (!u) return;
    this.revokingId.set(userRoleId);
    this.errorMsg.set('');
    this.userService.revokeRole(u.id, userRoleId).subscribe({
      next: () => {
        this.revokingId.set(null);
        this.successMsg.set('Rol revocado.');
        this.loadRoles(u.id);
      },
      error: () => {
        this.revokingId.set(null);
        this.errorMsg.set('No se pudo revocar.');
      },
    });
  }

  delete(): void {
    const u = this.user();
    if (!u?.id) return;
    this.deleting.set(true);
    this.errorMsg.set('');
    this.userService.deleteUser(u.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.back();
      },
      error: () => { this.deleting.set(false); this.errorMsg.set('No se pudo eliminar.'); },
    });
  }
}
