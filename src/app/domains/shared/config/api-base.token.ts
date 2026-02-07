// src/app/shared/config/api-base.token.ts
import { InjectionToken } from '@angular/core';
import { environment } from '@environments/environment';

export const API_BASE_URL = new InjectionToken<string>('API_BASE_URL', {
  providedIn: 'root',
  factory: () => environment.API_URL
});
// src/app/domains/shared/services/product.service.ts
