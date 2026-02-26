import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from '@services/token.service';
import { catchError, throwError } from 'rxjs';

const PUBLIC_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/recovery',
  '/auth/send-verify-email',
  '/auth/verify-email',
  '/auth/recover-password',
  '/auth/change-password',
  '/customers'
];

const isPublicEndpoint = (url: string): boolean => {
  try {
    const { pathname } = new URL(url, window.location.origin);
    return PUBLIC_ENDPOINTS.some((endpoint) => pathname.endsWith(endpoint));
  } catch {
    return false;
  }
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const token = tokenService.getToken();
  const isPublic = isPublicEndpoint(req.url);
  const shouldSkip = req.headers.has('x-skip-auth');

  let request = req;
  if (shouldSkip) {
    request = req.clone({ headers: req.headers.delete('x-skip-auth') });
  } else if (token && !isPublic) {
    request = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        (error.status === 401 || error.status === 403) &&
        !!token &&
        !isPublic
      ) {
        tokenService.removeToken();
        void router.navigate(['/auth/login'], {
          queryParams: { returnUrl: router.url }
        });
      }
      return throwError(() => error);
    })
  );
};
