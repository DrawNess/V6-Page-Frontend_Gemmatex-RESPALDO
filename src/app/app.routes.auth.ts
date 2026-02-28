import { Routes } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { RedirectGuard } from './guards/redirect.guard';

export const authRoutes: Routes = [
  {
    path: ROUTE_CONSTANTS.AUTH.LOGIN,
    loadComponent: () =>
      import('./domains/modules/auth/pages/login/login.component').then((m) => m.LoginComponent),
    canActivate: [RedirectGuard]
  },
  {
    path: ROUTE_CONSTANTS.AUTH.REGISTER,
    loadComponent: () =>
      import('./domains/modules/auth/pages/register/register.component').then((m) => m.RegisterComponent),
    canActivate: [RedirectGuard]
  },
  {
    path: ROUTE_CONSTANTS.AUTH.RECOVERY,
    loadComponent: () =>
      import('./domains/modules/auth/pages/recovery/recovery.component').then((m) => m.RecoveryComponent),
    canActivate: [RedirectGuard]
  },
  {
    path: 'resetPassword',
    redirectTo: ROUTE_CONSTANTS.AUTH.RESET_PASSWORD,
    pathMatch: 'full'
  },
  {
    path: ROUTE_CONSTANTS.AUTH.RESET_PASSWORD,
    loadComponent: () =>
      import('./domains/modules/auth/pages/forgot-password/forgot-password.component').then((m) => m.ForgotPasswordComponent),
    canActivate: [RedirectGuard]
  },
  {
    path: ROUTE_CONSTANTS.AUTH.VERIFY_SUCCESS,
    loadComponent: () =>
      import('./domains/modules/auth/pages/verify-success/verify-success.component').then((m) => m.VerifySuccessComponent),
    canActivate: [RedirectGuard]
  },
  {
    path: ROUTE_CONSTANTS.AUTH.VERIFY_EMAIL,
    loadComponent: () =>
      import('./domains/modules/auth/pages/verify-mail/verify-mail.component').then((m) => m.VerifyMailComponent),
    canActivate: [RedirectGuard]
  },
  {
    path: ROUTE_CONSTANTS.AUTH.VERIFY_REQUEST,
    loadComponent: () =>
      import('./domains/modules/auth/pages/verify-request/verify-request.component').then((m) => m.VerifyRequestComponent),
    canActivate: [RedirectGuard]
  }
];
