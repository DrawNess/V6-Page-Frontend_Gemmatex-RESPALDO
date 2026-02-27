import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { AuthService } from '@shared/services/auth.service';
import { UserService } from '@shared/services/user.service';
import { CustomerService } from '@shared/services/customer.service';
import { ApiCustomer, ApiUser } from '@shared/models/user-portal.model';
import { catchError, forkJoin, of } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { ProfileService } from '@shared/services/profile.service';

@Component({
  selector: 'app-account',
  imports: [CommonModule, RouterLink],
  templateUrl: './account.component.html',
  styleUrl: './account.component.css',
})
export class AccountComponent implements OnInit {
  readonly userBasePath = `/${ROUTE_CONSTANTS.USER.BASE}`;
  readonly userInfoPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.INFO}`;
  readonly userOrdersPath = `/${ROUTE_CONSTANTS.USER.BASE}/${ROUTE_CONSTANTS.USER.ORDERS}`;

  loading = false;
  user: ApiUser | null = null;
  customer: ApiCustomer | null = null;
  errorMsg = '';

  constructor(
    private readonly userService: UserService,
    private readonly customerService: CustomerService,
    private readonly profileService: ProfileService,
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.loadAccountSummary();
  }

  loadAccountSummary(): void {
    this.loading = true;
    this.errorMsg = '';

    this.profileService.getMeDetails().pipe(
      catchError(() =>
        forkJoin({
          user: this.userService.getCurrentUser(),
          customer: this.customerService.getCurrentCustomer().pipe(catchError(() => of(null)))
        })
      ),
      finalize(() => {
        this.loading = false;
      })
    ).subscribe({
      next: ({ user, customer }) => {
        this.user = user;
        this.customer = customer;
      },
      error: () => {
        this.errorMsg = 'No se pudo cargar tu sesión. Inicia sesión nuevamente.';
      },
    });
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth/login']);
  }

}
