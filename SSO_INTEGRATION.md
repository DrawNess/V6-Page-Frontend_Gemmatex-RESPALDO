# Integración Frontend ↔ SSO GEMMATEX

Resumen de los cambios aplicados al frontend ecommerce para consumir el SSO GEMMATEX como autoridad de identidad y mantener al API-V6 sólo como backend de catálogo + órdenes.

## Backends que el frontend consume

```
SSO_URL  = http://localhost:2106/api/v1   ← identidad, perfil, password, sesiones
API_URL  = http://localhost:1115/api/v1   ← catálogo, órdenes, ACL por sucursal
```

`environment.SSO_CLIENT_ID` se envía en el header `X-Client-Id` a cualquier request al SSO. En dev vale `app_ecommerce_dev`.

## Estrategia de tokens

| Token | Dónde vive | Quién lo lee |
|---|---|---|
| **Access token** (JWT RS256) | Memoria (`signal`) + `sessionStorage` | JS adjunta `Authorization: Bearer ...` |
| **Refresh token** | Cookie `httpOnly + Secure + SameSite=Strict + Path=/api/v1/auth` emitida por el SSO | Backend SSO (el JS nunca la ve) |

Todas las requests al SSO viajan con `withCredentials: true` para que la cookie del refresh fluya. `localStorage` queda fuera del flujo del JWT para mitigar XSS persistente.

## Auto-refresh

Implementado en `core/interceptors/auth.interceptor.ts`:

1. Request normal → adjunta `Authorization` y `X-Client-Id` (si SSO).
2. Backend responde `401` (token expirado).
3. Interceptor invoca `auth/refresh` UNA vez. Los requests concurrentes esperan via `BehaviorSubject`.
4. Si el refresh devuelve un access token nuevo → cada request original se reintenta con ese token.
5. Si el refresh falla → limpieza de sesión + redirect a `/auth/login` con `returnUrl`.

`app.component.ts` también dispara un silent refresh al arrancar la app, así una recarga de página no obliga a re-loguear mientras la cookie httpOnly siga viva.

## Archivos modificados

### Configuración

- `src/environments/environment.ts` — añade `SSO_URL` + `SSO_CLIENT_ID`.
- `src/environments/environment.development.ts` — íd.

### Models

- `src/app/domains/shared/models/auth.model.ts` — `AuthUser` ahora tiene `id: string` (UUID v7), `clientProfile` y `adminProfile`. Tipos nuevos: `SsoLoginResponse`, `SsoRegisterPayload`, `ClientProfile`, `AdminProfile`. Tipos viejos quedan deprecated.
- `src/app/domains/shared/models/user-portal.model.ts` — `ApiUser.id: string`, `ApiOrder.customerUuid`, snapshot de delivery (`address`), roles globales como strings.

### Servicios core

- `src/app/domains/shared/services/token.service.ts` — reescrito: signal en memoria + `sessionStorage`, parser de JWT RS256 con UUID `sub`. Métodos legacy (`getBranchesFromToken`, `getRoleFromToken`) marcados deprecated. `getUserIdFromToken()` devuelve `string | null`.
- `src/app/domains/shared/services/session.service.ts` — reescrito: estado mínimo (`userId` UUID + email + roles). Limpieza de claves legacy (`app_session_state_v1`, `app_customer_map_v1`). Métodos relacionados a `customerId` quedan como stubs no-op.
- `src/app/domains/shared/services/auth.service.ts` — totalmente migrado al SSO. Métodos: `login`, `register`, `logout`, `refresh`, `trySilentRefresh`, `sendVerifyEmail` (→ resend-verification), `verifyEmail`, `recoverPassword` (→ forgot-password), `changePassword` (→ reset-password), `changePasswordAuthenticated` (→ change-password).
- `src/app/domains/shared/services/profile.service.ts` — split: `getMe`, `getMeDetails`, `updateMe` apuntan al SSO; `getMyOrders`, `getMyOrderById` apuntan al API-V6. Capa de mapeo legacy `ApiCustomer ↔ ClientProfile`.
- `src/app/domains/shared/services/customer.service.ts` — apunta al SSO via `ProfileService` (self-service) y `/admin/users?role=client` (admin). Métodos viejos (`getMyAddress`, `updateMyAddress`, etc.) mantienen firma con mapeo interno.
- `src/app/domains/shared/services/user.service.ts` — admin CRUD apunta a `/admin/users` del SSO. `createUser` y `assignRole/revokeRole` ahora lanzan `501` para forzar uso de invitaciones / `updateUser` con `roles[]`. Catálogo de roles devuelto hardcoded.

### Interceptor + guards + bootstrap

- `src/app/core/interceptors/auth.interceptor.ts` — multi-URL, auto-refresh, header `X-Client-Id` automático al SSO, `withCredentials` automático al SSO.
- `src/app/core/guards/admin.guard.ts` — acepta `admin` y `super_admin`.
- `src/app/core/guards/panel.guard.ts` — acepta `admin`, `super_admin`, `staff` (roles globales del SSO). Los roles fine-grained (seller/cashier/...) viven en `user_branches` del API-V6 y no se evalúan acá.
- `src/app/core/guards/customer.guard.ts` — acepta `client` (SSO) + alias legacy `customer`/`user`/`cliente`. PANEL_ROLES ampliado.
- `src/app/app.component.ts` — `ngOnInit` dispara silent refresh.

### Componente registro

- `src/app/domains/modules/auth/pages/register/register.component.ts` — payload reformateado a SSO (`first_name`, `last_name`, `phone +591########`). El SSO ya envía el email de verificación al registrar, no hace falta llamar `sendVerifyEmail`.

### Componentes admin (panel) — ajustes mínimos

- `admin-profile.component.ts` — IDs como strings, edición de `status` en lugar de `isEmailVerified` (el SSO no lo expone editable).
- `admins-list.component.ts` — `userId` como `string` en sets/sets de IDs.
- `cart.service.ts` — `storageKeyForUser` ahora con `userId: string`.

## Pendiente refactor profundo (deuda registrada)

| Componente | Problema | Solución sugerida |
|---|---|---|
| `customer-profile.component.ts`, `customers-list.component.ts`, `customer-orders.component.ts` | usan `ApiCustomer.id` como número e IDs auto-incrementales | refactor para usar `userId: string` (UUID) directamente |
| `info-account.component.ts`, `address.component.ts`, `account.component.ts` | leen `details.customer.*` (nombre/apellido/teléfono); ya funcionan vía mapeo legacy | OK por ahora, eventualmente migrar a leer `user.clientProfile.*` directo |
| `assignRole` / `revokeRole` UI | el endpoint ya no existe (501) | usar `userService.updateUser(uuid, { roles: [...] })` o `POST /admin/user-branches` del API-V6 |

## Cómo probar localmente

1. Arrancar SSO en `localhost:2106` (`npm run dev` en `/home/draw/Pages/Single_Sign_On-GEMMATEX`).
2. Arrancar API-V6 clon en `localhost:1115` (`npm run dev` en `/home/draw/Pruebas-pages/respaldoParaNoMORIR-API-V6`).
3. `npm start` en este proyecto. Por defecto Angular arranca en `localhost:4200`.
4. CORS del SSO ya tiene `localhost:4200` en allowlist.
5. Registrar cliente nuevo desde `/auth/register` → verifica email → loguear → navegar.

## Convenciones para componentes nuevos

- **Identidad**: leer del `TokenService` (UUID v7) o del `SessionService`. Nunca compararla con `> 0`.
- **Perfil**: usar `ProfileService.getMeDetails()` → obtiene `{ user, customer }` (customer es mapeo legacy de `clientProfile`).
- **Orders**: cliente usa `ProfileService.getMyOrders()`; panel staff usa `OrderService.getOrders()`.
- **Admin users**: `UserService.getUsers()` → `/admin/users` del SSO. Para asignar rol global usar `updateUser(uuid, { roles: [...] })`. Para asignar sucursal usar `POST /api/v1/admin/user-branches` del API-V6 (servicio nuevo, aún no creado en el frontend).
