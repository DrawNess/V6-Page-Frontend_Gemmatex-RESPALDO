import { Routes } from '@angular/router';
import { LayoutComponent } from '@shared/components/layout/layout.component';
import { AuthGuard } from './guards/auth.guard';

export const userRoutes: Routes = [
  {
    path: 'mi-cuenta',
    component: LayoutComponent,
    canActivate: [AuthGuard],
    canActivateChild: [AuthGuard],
    children: [
      // Estructura base para rutas de usuario protegidas.
      // Cuando existan componentes:
      // { path: '', pathMatch: 'full', redirectTo: 'perfil' },
      // { path: 'perfil', loadComponent: () => import('./domains/user/pages/profile/profile.component').then(m => m.ProfileComponent) },
      // { path: 'pedidos', loadComponent: () => import('./domains/user/pages/orders/orders.component').then(m => m.OrdersComponent) },
      // { path: 'direcciones', loadComponent: () => import('./domains/user/pages/addresses/addresses.component').then(m => m.AddressesComponent) },
      // { path: 'favoritos', loadComponent: () => import('./domains/user/pages/favorites/favorites.component').then(m => m.FavoritesComponent) }
    ]
  }
];
