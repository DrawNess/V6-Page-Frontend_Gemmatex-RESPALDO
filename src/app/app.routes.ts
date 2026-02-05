import { Routes } from '@angular/router';
import { LayoutComponent } from '@shared/components/layout/layout.component';
import { NotFoundComponent } from '@info/pages/not-found/not-found.component';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { adminGuard } from '@core/guards/admin.guard';

// Componentes públicos - usando imports directos para mejor rendimiento inicial
import { ServicioTecnicoComponent } from './domains/pages/servicios/servicio-tecnico/servicio-tecnico.component';
import { EncuentranosComponent } from './domains/pages/encuentranos/encuentranos.component';
import { CatalogoComponent } from './domains/pages/catalogo/catalogo.component';
import { ServiciosMainComponent } from './domains/pages/servicios-empresa/servicios-main/servicios-main.component';
import { ImpresionDTFComponent } from './domains/pages/servicios-empresa/impresion-dtf/impresion-dtf.component';
import { PerfilesDeColorComponent } from './domains/pages/recursos/perfiles-de-color/perfiles-de-color.component';
import { SobreNosotrosComponent } from './domains/pages/empresa/sobre-nosotros/sobre-nosotros.component';
import { CheckoutComponent } from './domains/pages/pay/checkout/checkout.component';
import { DescargaPdfsComponent } from './domains/pages/descarga-pdfs/descarga-pdfs.component';
import { ProductosComponent } from './domains/catalogo/productos/productos.component';
import { OffersComponent } from './domains/catalogo/offers/offers.component';

// Componentes de autenticación
import { LoginComponent } from './domains/modules/auth/pages/login/login.component';
import { RegisterComponent } from './domains/modules/auth/pages/register/register.component';
import { RecoveryComponent } from './domains/modules/auth/pages/recovery/recovery.component';
import { ForgotPasswordComponent } from './domains/modules/auth/pages/forgot-password/forgot-password.component';
import { VerifySuccessComponent } from '@auth/pages/verify-success/verify-success.component';
import { VerifyMailComponent } from '@auth/pages/verify-mail/verify-mail.component';
import { VerifyRequestComponent } from '@auth/pages/verify-request/verify-request.component';

// Componentes administrativos - usando lazy loading para mejor rendimiento
const SECRET_BASE = ROUTE_CONSTANTS.SECRET_BASE;

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            // ========== RUTAS PÚBLICAS PRINCIPALES ==========
            {
                path: '',
                loadComponent: () => import('./domains/products/pages/list/list.component')
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.ABOUT,
                loadComponent: () => import('./domains/info/pages/about/about.component')
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.PRODUCT_DETAIL,
                loadComponent: () => import('./domains/products/pages/product-detail/product-detail.component')
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.SERVICIOS,
                component: ServiciosMainComponent
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.SERVICIO_TECNICO,
                component: ServicioTecnicoComponent
            },
            {
                path: `${ROUTE_CONSTANTS.PUBLIC.SERVICIOS}/dtf`,
                component: ImpresionDTFComponent
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.ENCUENTRANOS,
                component: EncuentranosComponent
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.CATALOGO,
                component: CatalogoComponent
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.PRODUCTOS,
                component: ProductosComponent
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.OFERTAS,
                component: OffersComponent
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.CHECKOUT,
                component: CheckoutComponent
            },
            
            // ========== RUTAS DE RECURSOS ==========
            {
                path: ROUTE_CONSTANTS.PUBLIC.RECURSOS.PERFILES_COLOR,
                component: PerfilesDeColorComponent
            },
            {
                path: ROUTE_CONSTANTS.PUBLIC.RECURSOS.PDFS,
                component: DescargaPdfsComponent
            },
            
            // ========== RUTAS DE EMPRESA ==========
            {
                path: ROUTE_CONSTANTS.PUBLIC.EMPRESA.SOBRE_NOSOTROS,
                component: SobreNosotrosComponent
            },
            
            // ========== RUTAS DE AUTENTICACIÓN ==========
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
            },
            
            // ========== RUTAS ADMINISTRATIVAS (PROTEGIDAS) ==========
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.MENU_SECRETO}`,
                loadComponent: () => import('./domains/pages/secret-admin/menu-secret/menu-secret.component/menu-secret.component.component').then(m => m.MenuSecretComponentComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.PANEL_PRODUCTOS}`,
                loadComponent: () => import('./domains/pages/secret-admin/products-manager/products-manager.component/products-manager.component.component').then(m => m.ProductsManagerComponentComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.OFFERS_MENU}`,
                loadComponent: () => import('./domains/pages/MenuProducts/offers-menu/offers-menu.component').then(m => m.OffersMenuComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.MENU}`,
                loadComponent: () => import('./domains/pages/MenuProducts/menu/menu.component').then(m => m.MenuComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.CATEGORIES}`,
                loadComponent: () => import('./domains/pages/MenuProducts/categories/categories.component').then(m => m.CategoriesComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.SUBCATEGORIES}`,
                loadComponent: () => import('./domains/pages/MenuProducts/subcategories/subcategories.component').then(m => m.SubcategoriesComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.PRODUCTS}`,
                loadComponent: () => import('./domains/pages/MenuProducts/products/products.component').then(m => m.ProductsComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.MENU_ADDS}`,
                loadComponent: () => import('./domains/pages/MenuProducts/adds/menu-adds/menu-adds.component').then(m => m.MenuAddsComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.HERO_SLIDES}`,
                loadComponent: () => import('./domains/pages/MenuProducts/adds/hero-slides/hero-slides.component').then(m => m.HeroSlidesComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.OFFERS_ADDS}`,
                loadComponent: () => import('./domains/pages/MenuProducts/adds/offers-adds/offers-adds.component').then(m => m.OffersAddsComponent),
                canActivate: [adminGuard]
            },
            {
                path: `${SECRET_BASE}/${ROUTE_CONSTANTS.ADMIN.PROMO}`,
                loadComponent: () => import('./domains/pages/MenuProducts/adds/promo/promo.component').then(m => m.PromoComponent),
                canActivate: [adminGuard]
            }
        ]
    },
    // ========== RUTA 404 ==========
    {
        path: '**',
        component: NotFoundComponent
    }
];
