import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { TokenService } from '@services/token.service';
import { catchError, throwError } from 'rxjs';

type PublicEndpointRule = { path: string; methods?: string[] };

const PUBLIC_ENDPOINTS: PublicEndpointRule[] = [
  { path: '/auth/login', methods: ['POST'] },
  { path: '/auth/send-verify-email', methods: ['POST'] },
  { path: '/auth/verify-email', methods: ['POST'] },
  { path: '/auth/recover-password', methods: ['POST'] },
  { path: '/auth/change-password', methods: ['POST'] },
  { path: '/customers', methods: ['POST'] } // registro público customer + user
];

const isPublicEndpoint = (url: string, method: string): boolean => {
  try {
    const { pathname } = new URL(url, window.location.origin);
    const upperMethod = method.toUpperCase();
    return PUBLIC_ENDPOINTS.some((rule) => {
      if (!pathname.endsWith(rule.path)) {
        return false;
      }
      if (!rule.methods?.length) {
        return true;
      }
      return rule.methods.includes(upperMethod);
    });
  } catch {
    return false;
  }
};

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const router = inject(Router);
  const token = tokenService.getToken();
  const isAuthenticated = tokenService.isAuthenticated();
  const isPublic = isPublicEndpoint(req.url, req.method);
  const shouldSkip = req.headers.has('x-skip-auth');

  let request = req;
  if (shouldSkip) {
    request = req.clone({ headers: req.headers.delete('x-skip-auth') });
  } else if (token && isAuthenticated && !isPublic) {
    request = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  } else if (token && !isAuthenticated) {
    tokenService.removeToken();
  }

  return next(request).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 401 &&
        isAuthenticated &&
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
