import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { ApiUser, ApiUserRole } from '@shared/models/user-portal.model';
import { CustomerService } from '@shared/services/customer.service';
import { UserService } from '@shared/services/user.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

const ADMIN_ROLE_SLUGS = new Set(['admin', 'branch_admin', 'seller', 'staff']);

@Component({
  selector: 'app-admins-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admins-list.component.html',
})
export class AdminsListComponent {
  private readonly userService = inject(UserService);
  private readonly customerService = inject(CustomerService);
  private readonly router = inject(Router);

  private readonly basePath = `/${ROUTE_CONSTANTS.SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.USERS}/admins`;

  readonly users = signal<ApiUser[]>([]);
  // UUID v7 (string) tras la integración SSO. Antes era INT.
  readonly customerUserIds = signal<Set<string>>(new Set());
  readonly loading = signal(false);
  readonly creating = signal(false);
  readonly errorMsg = signal('');
  readonly successMsg = signal('');

  newEmail = '';
  newPassword = '';
  queryUserId: number | null = null;

  readonly admins = computed(() => this.users().filter(u => this.isAdmin(u)));

  constructor() {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.errorMsg.set('');
    forkJoin({
      users: this.userService.getUsers().pipe(catchError(() => of([] as ApiUser[]))),
      customers: this.customerService.getCustomers().pipe(catchError(() => of([] as { userId?: string | number }[]))),
    }).subscribe({
      next: ({ users, customers }) => {
        const ids = new Set<string>();
        for (const c of customers) {
          const uid = (c as any)?.userId;
          if (uid !== undefined && uid !== null && String(uid).length > 0) {
            ids.add(String(uid));
          }
        }
        this.customerUserIds.set(ids);
        this.users.set(users);
        this.loading.set(false);
      },
      error: () => { this.errorMsg.set('No se pudo cargar usuarios.'); this.loading.set(false); },
    });
  }

  create(): void {
    const email = this.newEmail.trim();
    const password = this.newPassword.trim();
    if (!email || !password) {
      this.errorMsg.set('Email y contraseña requeridos.');
      return;
    }
    this.creating.set(true);
    this.errorMsg.set('');
    this.userService.createUser({ email, password }).subscribe({
      next: (created) => {
        this.creating.set(false);
        this.newEmail = '';
        this.newPassword = '';
        this.successMsg.set(`Usuario #${created.id} creado.`);
        this.load();
        this.openProfile(created.id);
      },
      error: () => { this.creating.set(false); this.errorMsg.set('No se pudo crear usuario.'); },
    });
  }

  goById(): void {
    const id = (this.queryUserId ?? '').toString().trim();
    if (!id) {
      this.errorMsg.set('ID inválido.');
      return;
    }
    this.openProfile(id);
  }

  openProfile(userId: string | number): void {
    this.router.navigate([this.basePath, String(userId)]);
  }

  rolesOf(user: ApiUser): string[] {
    if (Array.isArray(user.userRoles) && user.userRoles.length) {
      return user.userRoles.map((ur: ApiUserRole) => ur.role?.slug).filter((s): s is string => !!s);
    }
    if (Array.isArray(user.roles)) return user.roles;
    if (typeof user.role === 'string') return [user.role];
    return [];
  }

  private isAdmin(user: ApiUser): boolean {
    const roles = this.rolesOf(user);
    if (roles.some(r => ADMIN_ROLE_SLUGS.has(r))) return true;
    // Fallback when /users payload omits roles: any user not linked to a customer record is treated as panel-side
    if (roles.length === 0) return !this.customerUserIds().has(String(user.id));
    return false;
  }

  trackById = (_: number, u: ApiUser) => u.id;
}
