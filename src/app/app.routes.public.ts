import { Routes } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';

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

export const publicRoutes: Routes = [
  {
    path: '',
    loadComponent: () => import('./domains/products/pages/list/list.component').then(m => m.default)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.ABOUT,
    loadComponent: () => import('./domains/info/pages/about/about.component').then(m => m.default)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.PRODUCT_DETAIL,
    loadComponent: () => import('./domains/products/pages/product-detail/product-detail.component').then(m => m.default)
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
  {
    path: ROUTE_CONSTANTS.PUBLIC.RECURSOS.PERFILES_COLOR,
    component: PerfilesDeColorComponent
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.RECURSOS.PDFS,
    component: DescargaPdfsComponent
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.EMPRESA.SOBRE_NOSOTROS,
    component: SobreNosotrosComponent
  }
];
