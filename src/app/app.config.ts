import { ApplicationConfig, LOCALE_ID } from '@angular/core';
import { NoPreloading, provideRouter, withComponentInputBinding, withPreloading } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { authInterceptor } from '@core/interceptors/auth.interceptor';

import { routes } from './app.routes';

registerLocaleData(localeEs, 'es');

export const appConfig: ApplicationConfig = {
  providers: [
    { provide: LOCALE_ID, useValue: 'es' },
    provideRouter(routes, withComponentInputBinding(), withPreloading(NoPreloading)),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
