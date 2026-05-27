import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';

import { environment } from '@environments/environment';
import { TokenService } from '@services/token.service';
import { AuthService } from '@services/auth.service';
import { SessionService } from '@services/session.service';

/**
 * Endpoints públicos del SSO que NO requieren JWT (login, registro, etc.).
 * Para esos, el interceptor no adjunta `Authorization` y un 401 NO redirige.
 */
type PublicEndpointRule = { path: string; methods?: string[] };
const PUBLIC_ENDPOINTS: PublicEndpointRule[] = [
  { path: '/auth/login', methods: ['POST'] },
  { path: '/auth/register', methods: ['POST'] },
  { path: '/auth/refresh', methods: ['POST'] },
  { path: '/auth/forgot-password', methods: ['POST'] },
  { path: '/auth/reset-password', methods: ['POST'] },
  { path: '/auth/verify-email', methods: ['POST', 'GET'] },
  { path: '/auth/resend-verification', methods: ['POST'] },
  { path: '/auth/accept-invitation', methods: ['POST'] },
];

const isPublicEndpoint = (url: string, method: string): boolean => {
  try {
    const { pathname } = new URL(url, window.location.origin);
    const upperMethod = method.toUpperCase();
    return PUBLIC_ENDPOINTS.some((rule) => {
      if (!pathname.endsWith(rule.path)) return false;
      if (!rule.methods?.length) return true;
      return rule.methods.includes(upperMethod);
    });
  } catch {
    return false;
  }
};

const isSsoRequest = (url: string): boolean => {
  try {
    return url.startsWith(environment.SSO_URL);
  } catch {
    return false;
  }
};

/**
 * Coordina los refresh concurrentes. Si varias requests fallan con 401 al
 * mismo tiempo, solo una dispara `auth/refresh` y las demás esperan al
 * nuevo token.
 */
let isRefreshing = false;
const refreshSubject = new BehaviorSubject<string | null>(null);

function applyAuth(req: HttpRequest<unknown>, token: string | null): HttpRequest<unknown> {
  const setHeaders: Record<string, string> = {};
  if (token) setHeaders['Authorization'] = `Bearer ${token}`;
  if (isSsoRequest(req.url)) setHeaders['X-Client-Id'] = environment.SSO_CLIENT_ID;

  return req.clone({
    setHeaders,
    // `withCredentials` permite que la cookie httpOnly del refresh viaje
    // hacia el SSO. En requests al API-V6 no daña pero es innecesario.
    withCredentials: isSsoRequest(req.url) ? true : req.withCredentials,
  });
}

function handleRefreshAndRetry(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  tokenService: TokenService,
  sessionService: SessionService,
  router: Router
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshSubject.next(null);

    return authService.refresh().pipe(
      switchMap((response) => {
        isRefreshing = false;
        const newToken = response.access_token;
        refreshSubject.next(newToken);
        return next(applyAuth(req, newToken));
      }),
      catchError((err) => {
        isRefreshing = false;
        refreshSubject.next(null);
        tokenService.removeToken();
        sessionService.clearSession();
        void router.navigate(['/auth/login'], {
          queryParams: { returnUrl: router.url },
        });
        return throwError(() => err);
      })
    );
  }

  // Ya hay un refresh en vuelo — esperar al token nuevo y reintentar.
  return refreshSubject.pipe(
    filter((t) => t !== null),
    take(1),
    switchMap((newToken) => next(applyAuth(req, newToken)))
  );
}

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenService = inject(TokenService);
  const authService = inject(AuthService);
  const sessionService = inject(SessionService);
  const router = inject(Router);

  const isPublic = isPublicEndpoint(req.url, req.method);
  const skipHeader = req.headers.has('x-skip-auth');

  // Permite a un caller forzar bypass (ej. retries internos).
  if (skipHeader) {
    const cleaned = req.clone({ headers: req.headers.delete('x-skip-auth') });
    return next(cleaned);
  }

  const token = tokenService.getToken();

  // Endpoint público (login/register/refresh/forgot/etc.): NO adjuntamos
  // Authorization; sólo X-Client-Id + credentials si va al SSO.
  if (isPublic) {
    const prepared = isSsoRequest(req.url)
      ? req.clone({
          setHeaders: { 'X-Client-Id': environment.SSO_CLIENT_ID },
          withCredentials: true,
        })
      : req;
    return next(prepared).pipe(
      catchError((err: unknown) => throwError(() => err))
    );
  }

  // Endpoint privado: adjuntamos el token aunque esté localmente expirado.
  // El servidor decide. Si responde 401, el bloque de abajo dispara refresh
  // + retry (una sola vez, coordinado entre requests paralelos).
  const authedReq = applyAuth(req, token);

  return next(authedReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse && err.status === 401) {
        const isRefreshCall = req.url.endsWith('/auth/refresh');
        if (isRefreshCall) {
          tokenService.removeToken();
          sessionService.clearSession();
          void router.navigate(['/auth/login'], {
            queryParams: { returnUrl: router.url },
          });
          return throwError(() => err);
        }
        return handleRefreshAndRetry(
          req,
          next,
          authService,
          tokenService,
          sessionService,
          router
        );
      }
      return throwError(() => err);
    })
  );
};
