import { Routes } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

import { LoginComponent } from './domains/modules/auth/pages/login/login.component';
import { RegisterComponent } from './domains/modules/auth/pages/register/register.component';
import { RecoveryComponent } from './domains/modules/auth/pages/recovery/recovery.component';
import { ForgotPasswordComponent } from './domains/modules/auth/pages/forgot-password/forgot-password.component';
import { VerifySuccessComponent } from '@auth/pages/verify-success/verify-success.component';
import { VerifyMailComponent } from '@auth/pages/verify-mail/verify-mail.component';
import { VerifyRequestComponent } from '@auth/pages/verify-request/verify-request.component';

export const authRoutes: Routes = [
  {
    path: ROUTE_CONSTANTS.AUTH.LOGIN,
    component: LoginComponent
  },
  {
    path: ROUTE_CONSTANTS.AUTH.REGISTER,
    component: RegisterComponent
  },
  {
    path: ROUTE_CONSTANTS.AUTH.RECOVERY,
    component: RecoveryComponent
  },
  {
    path: ROUTE_CONSTANTS.AUTH.RESET_PASSWORD,
    component: ForgotPasswordComponent
  },
  {
    path: ROUTE_CONSTANTS.AUTH.VERIFY_SUCCESS,
    component: VerifySuccessComponent
  },
  {
    path: ROUTE_CONSTANTS.AUTH.VERIFY_EMAIL,
    component: VerifyMailComponent
  },
  {
    path: ROUTE_CONSTANTS.AUTH.VERIFY_REQUEST,
    component: VerifyRequestComponent
  }
];
