import { Routes } from '@angular/router';
import { NotFoundComponent } from '@info/pages/not-found/not-found.component';
import { publicRoutes } from './app.routes.public';
import { authRoutes } from './app.routes.auth';
import { userRoutes } from './app.routes.user';
import { adminRoutes } from './app.routes.admin';
import { LayoutComponent } from '@shared/components/layout/layout.component';
import { AuthGuard } from './guards/auth.guard';
import { adminGuard } from '@core/guards/admin.guard';

export const routes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [...publicRoutes, ...authRoutes]
  },
  {
    path: '',
    canActivateChild: [AuthGuard],
    children: [...userRoutes]
  },
  {
    path: '',
    canActivateChild: [AuthGuard, adminGuard],
    children: [...adminRoutes]
  },
  {
    path: '**',
    component: NotFoundComponent
  }
];
