import { Routes } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { adminGuard } from '@core/guards/admin.guard';
import { AdminLayoutComponent } from './domains/pages/admin-layout/admin-layout.component';

const SECRET_BASE = ROUTE_CONSTANTS.SECRET_BASE;

export const adminRoutes: Routes = [
  {
    path: SECRET_BASE,
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    component: AdminLayoutComponent,
    children: [
      // Redirect a productos por defecto
      { path: '', redirectTo: ROUTE_CONSTANTS.ADMIN.PRODUCTS, pathMatch: 'full' },
      {
        path: ROUTE_CONSTANTS.ADMIN.MENU_SECRETO,
        loadComponent: () =>
          import('./domains/pages/secret-admin/menu-secret/menu-secret.component/menu-secret.component.component').then(
            m => m.MenuSecretComponentComponent
          )
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.PANEL_PRODUCTOS,
        loadComponent: () =>
          import(
            './domains/pages/secret-admin/products-manager/products-manager.component/products-manager.component.component'
          ).then(m => m.ProductsManagerComponentComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.OFFERS_MENU,
        loadComponent: () => import('./domains/pages/MenuProducts/offers-menu/offers-menu.component').then(m => m.OffersMenuComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.MENU,
        loadComponent: () => import('./domains/pages/MenuProducts/menu/menu.component').then(m => m.MenuComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.USERS,
        loadComponent: () =>
          import('./domains/pages/MenuProducts/users-management/users-management.component').then(
            m => m.UsersManagementComponent
          )
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.ORDERS_BY_CUSTOMER,
        loadComponent: () =>
          import('./domains/pages/MenuProducts/orders-by-customer/orders-by-customer.component').then(
            m => m.OrdersByCustomerComponent
          )
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.ORDERS_ADMIN,
        loadComponent: () =>
          import('./domains/pages/MenuProducts/orders-admin/orders-admin.component').then(
            m => m.OrdersAdminComponent
          )
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.CATEGORIES,
        loadComponent: () => import('./domains/pages/MenuProducts/categories/categories.component').then(m => m.CategoriesComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.SUBCATEGORIES,
        loadComponent: () => import('./domains/pages/MenuProducts/subcategories/subcategories.component').then(m => m.SubcategoriesComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.PRODUCTS,
        loadComponent: () => import('./domains/pages/MenuProducts/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.MENU_ADDS,
        loadComponent: () => import('./domains/pages/MenuProducts/adds/menu-adds/menu-adds.component').then(m => m.MenuAddsComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.HERO_SLIDES,
        loadComponent: () => import('./domains/pages/MenuProducts/adds/hero-slides/hero-slides.component').then(m => m.HeroSlidesComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.OFFERS_ADDS,
        loadComponent: () => import('./domains/pages/MenuProducts/adds/offers-adds/offers-adds.component').then(m => m.OffersAddsComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.PROMO,
        loadComponent: () => import('./domains/pages/MenuProducts/adds/promo/promo.component').then(m => m.PromoComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.VARIANTS,
        loadComponent: () => import('./domains/pages/MenuProducts/variants/variants.component').then(m => m.VariantsComponent)
      }
    ]
  }
];
