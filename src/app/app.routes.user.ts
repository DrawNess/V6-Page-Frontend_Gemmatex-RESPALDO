import { Routes } from '@angular/router';
import { LayoutComponent } from '@shared/components/layout/layout.component';
import { customerGuard } from '@core/guards/customer.guard';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

export const userRoutes: Routes = [
  {
    path: ROUTE_CONSTANTS.USER.BASE,
    component: LayoutComponent,
    canActivate: [customerGuard],
    canActivateChild: [customerGuard],
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./domains/modules/users/account/account.component').then((m) => m.AccountComponent),
      },
      {
        path: ROUTE_CONSTANTS.USER.INFO,
        loadComponent: () =>
          import('./domains/modules/users/info-account/info-account.component').then((m) => m.InfoAccountComponent),
      },
      {
        path: ROUTE_CONSTANTS.USER.ORDERS,
        loadComponent: () =>
          import('./domains/modules/users/orders/orders.component').then((m) => m.OrdersComponent),
      },
      {
        path: ROUTE_CONSTANTS.USER.ADDRESS,
        loadComponent: () =>
          import('./domains/modules/users/address/address.component').then((m) => m.AddressComponent),
      }
    ]
  }
];
