import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { UserService } from '@shared/services/user.service';
import { CustomerService } from '@shared/services/customer.service';
import { ApiCustomer, ApiUser } from '@shared/models/user-portal.model';
import { catchError, forkJoin, of } from 'rxjs';
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
  customer: ApiCustomer | null = null;
  errorMsg = '';

  constructor(
    private readonly userService: UserService,
    private readonly customerService: CustomerService,
  ) {}

  ngOnInit(): void {
    this.loading = true;
    forkJoin({
      user: this.userService.getCurrentUser().pipe(catchError(() => of(null))),
      customer: this.customerService.getMyCustomer().pipe(catchError(() => of(null))),
    }).pipe(finalize(() => (this.loading = false)))
      .subscribe({
        next: ({ user, customer }) => {
          this.user = user;
          this.customer = customer;
        },
        error: () => {
          this.errorMsg = 'No se pudo cargar tu sesión. Inicia sesión nuevamente.';
        },
      });
  }
}
