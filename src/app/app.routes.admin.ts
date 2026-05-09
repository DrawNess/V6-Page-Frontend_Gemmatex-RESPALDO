import { Routes } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { adminGuard } from '@core/guards/admin.guard';
import { panelGuard } from '@core/guards/panel.guard';
import { AdminLayoutComponent } from './domains/modules/admin/admin-layout/admin-layout.component';

const SECRET_BASE = ROUTE_CONSTANTS.SECRET_BASE;

export const adminRoutes: Routes = [
  {
    path: SECRET_BASE,
    canActivate: [panelGuard],
    canActivateChild: [panelGuard],
    component: AdminLayoutComponent,
    children: [
      // Redirect a productos por defecto
      { path: '', redirectTo: ROUTE_CONSTANTS.ADMIN.PRODUCTS, pathMatch: 'full' },
      {
        path: ROUTE_CONSTANTS.ADMIN.MENU_SECRETO,
        loadComponent: () =>
          import('./domains/modules/admin/secret-admin/menu-secret/menu-secret.component/menu-secret.component.component').then(
            m => m.MenuSecretComponentComponent
          )
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.PANEL_PRODUCTOS,
        loadComponent: () =>
          import(
            './domains/modules/admin/secret-admin/products-manager/products-manager.component/products-manager.component.component'
          ).then(m => m.ProductsManagerComponentComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.OFFERS_MENU,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/offers-menu/offers-menu.component').then(m => m.OffersMenuComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.MENU,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/menu/menu.component').then(m => m.MenuComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.USERS,
        canActivate: [adminGuard],
        loadComponent: () =>
          import('./domains/modules/admin/MenuProducts/users-management/users-management.component').then(
            m => m.UsersManagementComponent
          ),
        children: [
          { path: '', redirectTo: 'admins', pathMatch: 'full' },
          {
            path: 'admins',
            loadComponent: () =>
              import('./domains/modules/admin/MenuProducts/users-management/components/admins-list/admins-list.component').then(
                m => m.AdminsListComponent
              )
          },
          {
            path: 'admins/:userId',
            loadComponent: () =>
              import('./domains/modules/admin/MenuProducts/users-management/components/admin-profile/admin-profile.component').then(
                m => m.AdminProfileComponent
              )
          },
          {
            path: 'customers',
            loadComponent: () =>
              import('./domains/modules/admin/MenuProducts/users-management/components/customers-list/customers-list.component').then(
                m => m.CustomersListComponent
              )
          },
          {
            path: 'customers/:customerId',
            loadComponent: () =>
              import('./domains/modules/admin/MenuProducts/users-management/components/customer-profile/customer-profile.component').then(
                m => m.CustomerProfileComponent
              )
          },
          {
            path: 'customers/:customerId/orders',
            loadComponent: () =>
              import('./domains/modules/admin/MenuProducts/users-management/components/customer-orders/customer-orders.component').then(
                m => m.CustomerOrdersComponent
              )
          }
        ]
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.ORDERS_BY_CUSTOMER,
        loadComponent: () =>
          import('./domains/modules/admin/MenuProducts/orders-by-customer/orders-by-customer.component').then(
            m => m.OrdersByCustomerComponent
          )
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.ORDERS_ADMIN,
        loadComponent: () =>
          import('./domains/modules/admin/MenuProducts/orders-admin/orders-admin.component').then(
            m => m.OrdersAdminComponent
          )
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.CATEGORIES,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/categories/categories.component').then(m => m.CategoriesComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.SUBCATEGORIES,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/subcategories/subcategories.component').then(m => m.SubcategoriesComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.PRODUCTS,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/products/products.component').then(m => m.ProductsComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.MENU_ADDS,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/adds/menu-adds/menu-adds.component').then(m => m.MenuAddsComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.HERO_SLIDES,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/adds/hero-slides/hero-slides.component').then(m => m.HeroSlidesComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.OFFERS_ADDS,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/adds/offers-adds/offers-adds.component').then(m => m.OffersAddsComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.PROMO,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/adds/promo/promo.component').then(m => m.PromoComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.VARIANTS,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/variants/variants.component').then(m => m.VariantsComponent)
      },
      {
        path: ROUTE_CONSTANTS.ADMIN.BULK_UPLOAD,
        loadComponent: () => import('./domains/modules/admin/MenuProducts/bulk-upload/bulk-upload.component').then(m => m.BulkUploadComponent)
      }
    ]
  }
];
