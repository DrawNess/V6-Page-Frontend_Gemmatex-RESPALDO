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
        ]
    },
    {
        path: '**',
        component: NotFoundComponent
    }
];
