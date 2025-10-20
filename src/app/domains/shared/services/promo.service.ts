// src/app/shared/services/promo.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Promo } from '@shared/models/promo.model';

@Injectable({
  providedIn: 'root'
})
export class PromoService {

  constructor() { }

  private http = inject(HttpClient);
  private base = 'http://localhost:3000/api/v1';

  getAll() {
    return this.http.get<Promo[]>(`${this.base}/promos`);
  }
}
