import { Routes } from '@angular/router';
import { LayoutComponent } from '@shared/components/layout/layout.component';
import { NotFoundComponent } from '@info/pages/not-found/not-found.component';
import { ServicioTecnicoComponent } from './domains/pages/servicios/servicio-tecnico/servicio-tecnico.component';
import { EncuentranosComponent } from './domains/pages/encuentranos/encuentranos.component';
import { CatalogoComponent } from './domains/pages/catalogo/catalogo.component';
import { LoginComponent } from './domains/pages/login/login.component';

import { ServiciosMainComponent } from './domains/pages/servicios-empresa/servicios-main/servicios-main.component';
import { ImpresionDTFComponent } from './domains/pages/servicios-empresa/impresion-dtf/impresion-dtf.component';

import { PerfilesDeColorComponent } from './domains/pages/recursos/perfiles-de-color/perfiles-de-color.component';

import { SobreNosotrosComponent } from './domains/pages/empresa/sobre-nosotros/sobre-nosotros.component';

import { CheckoutComponent } from './domains/pages/pay/checkout/checkout.component';

import { MenuSecretComponentComponent } from './domains/pages/secret-admin/menu-secret/menu-secret.component/menu-secret.component.component';
import { ProductsManagerComponentComponent } from './domains/pages/secret-admin/products-manager/products-manager.component/products-manager.component.component'

import { DescargaPdfsComponent} from './domains/pages/descarga-pdfs/descarga-pdfs.component';

import { ProductosComponent } from './domains/catalogo/productos/productos.component'
import { OffersComponent } from './domains/catalogo/offers/offers.component'



/* RUTA SECRETA --- MENU --- */

import { MenuComponent } from './domains/pages/MenuProducts/menu/menu.component';
import { CategoriesComponent } from './domains/pages/MenuProducts/categories/categories.component';
import { SubcategoriesComponent} from './domains/pages/MenuProducts/subcategories/subcategories.component';
import { ProductsComponent } from './domains/pages/MenuProducts/products/products.component';

import { MenuAddsComponent } from './domains/pages/MenuProducts/adds/menu-adds/menu-adds.component';
import { HeroSlidesComponent } from './domains/pages/MenuProducts/adds/hero-slides/hero-slides.component';
import { OffersAddsComponent } from './domains/pages/MenuProducts/adds/offers-adds/offers-adds.component';
import { PromoComponent } from './domains/pages/MenuProducts/adds/promo/promo.component';

export const SECRET_BASE = 'admin-gx-panel-secreto-6f3e2b3e-9c31-4c8c-8cfa-ccf06b9b1c21';

export const routes: Routes = [
    {
        path: '',
        component: LayoutComponent,
        children: [
            {
                path: '',
                loadComponent: () => import('./domains/products/pages/list/list.component')
            },
            {
                path: 'login',
                component: LoginComponent
            },
            {
                path: 'about',
                loadComponent: () => import('./domains/info/pages/about/about.component')
            },
            {
                path: 'product/:id',
                loadComponent: () => import('./domains/products/pages/product-detail/product-detail.component')
            },
            {
                path: 'servicios',
                component: ServiciosMainComponent
            },
            {
                path: 'encuentranos',
                component: EncuentranosComponent
            },
            {
                path: 'catalogo',
                component: CatalogoComponent
            },
            {
                path: 'servicio-tecnico',
                component: ServicioTecnicoComponent
            },
            {
                path: 'servicios/dtf',
                component: ImpresionDTFComponent
            },
            {
                path: 'recursos/perfiles-de-color',
                component: PerfilesDeColorComponent
            },
            {
                path: 'empresa/sobre-nosotros',
                component: SobreNosotrosComponent
            },
            {
                path: 'checkout',
                component: CheckoutComponent
            },
            {
                path: `${SECRET_BASE}/menu-secreto`,
                component: MenuSecretComponentComponent
            },
            {
                path: `${SECRET_BASE}/panel-productos`,
                component: ProductsManagerComponentComponent
            },
            {
                path: 'recursos/pdfs',
                component: DescargaPdfsComponent
            },
            {
                path: 'productos',
                component: ProductosComponent
            },
            {
                path: 'ofertas',
                component: OffersComponent
            }
            ,{
                path: `${SECRET_BASE}/menu`,
                component: MenuComponent
            },
            {
                path: `${SECRET_BASE}/categories`,
                component: CategoriesComponent
            },
            { 
                path: `${SECRET_BASE}/subcategories`,
                component: SubcategoriesComponent
            },
            {
                path: `${SECRET_BASE}/products`,
                component: ProductsComponent
            },
            {
                path: `${SECRET_BASE}/menu-adds`,
                component: MenuAddsComponent
            },
            {
                path: `${SECRET_BASE}/menu-adds/hero-slides`,
                component: HeroSlidesComponent
            },
            {
                path: `${SECRET_BASE}/menu-adds/offers-adds`,
                component: OffersAddsComponent
            },
            {
                path: `${SECRET_BASE}/menu-adds/promo`,
                component: PromoComponent
            }
        ]
    },
    {
        path: '**',
        component: NotFoundComponent
    }
];
