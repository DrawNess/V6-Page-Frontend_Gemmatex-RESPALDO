import { Routes } from '@angular/router';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';
import { customerGuard } from '@core/guards/customer.guard';

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
    loadComponent: () =>
      import('./domains/pages/servicios-empresa/servicios-main/servicios-main.component').then((m) => m.ServiciosMainComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.SERVICIO_TECNICO,
    loadComponent: () =>
      import('./domains/pages/servicios/servicio-tecnico/servicio-tecnico.component').then((m) => m.ServicioTecnicoComponent)
  },
  {
    path: `${ROUTE_CONSTANTS.PUBLIC.SERVICIOS}/dtf`,
    loadComponent: () =>
      import('./domains/pages/servicios-empresa/impresion-dtf/impresion-dtf.component').then((m) => m.ImpresionDTFComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.ENCUENTRANOS,
    loadComponent: () =>
      import('./domains/pages/encuentranos/encuentranos.component').then((m) => m.EncuentranosComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.CATALOGO,
    loadComponent: () =>
      import('./domains/pages/catalogo/catalogo.component').then((m) => m.CatalogoComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.PRODUCTOS,
    loadComponent: () =>
      import('./domains/catalogo/productos/productos.component').then((m) => m.ProductosComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.OFERTAS,
    loadComponent: () =>
      import('./domains/catalogo/offers/offers.component').then((m) => m.OffersComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.CHECKOUT,
    canActivate: [customerGuard],
    loadComponent: () =>
      import('./domains/pages/pay/checkout/checkout.component').then((m) => m.CheckoutComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.SHIPPING,
    canActivate: [customerGuard],
    loadComponent: () =>
      import('./domains/pages/pay/shipping/shipping.component').then((m) => m.ShippingComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.RECURSOS.PERFILES_COLOR,
    loadComponent: () =>
      import('./domains/pages/recursos/perfiles-de-color/perfiles-de-color.component').then((m) => m.PerfilesDeColorComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.RECURSOS.PDFS,
    loadComponent: () =>
      import('./domains/pages/descarga-pdfs/descarga-pdfs.component').then((m) => m.DescargaPdfsComponent)
  },
  {
    path: ROUTE_CONSTANTS.PUBLIC.EMPRESA.SOBRE_NOSOTROS,
    loadComponent: () =>
      import('./domains/pages/empresa/sobre-nosotros/sobre-nosotros.component').then((m) => m.SobreNosotrosComponent)
  }
];
