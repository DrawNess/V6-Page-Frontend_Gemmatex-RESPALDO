// src/app/shared/config/api-base.token.ts
import { InjectionToken, isDevMode } from '@angular/core';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => isDevMode()
    ? 'http://localhost:3000/api/v1'            // DEV
    : 'https://gemmatex.store/api/v1'           // PROD
});
// src/app/domains/shared/services/product.service.ts