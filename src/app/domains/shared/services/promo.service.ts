// src/app/shared/services/promo.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Promo } from '@shared/models/promo.model';

@Injectable({
  providedIn: 'root'
})
export class PromoService {

  private http = inject(HttpClient);
  private base = 'https://gemmatex.store/api/v1/promos';

  constructor() { }

  // GET /promos
  getAll() {
    return this.http.get<Promo[]>(this.base);
  }

  // GET /promos/:id
  getOne(id: number | string) {
    return this.http.get<Promo>(`${this.base}/${id}`);
  }

  // POST /promos
  create(payload: Partial<Promo>) {
    return this.http.post<Promo>(this.base, payload);
  }

  // PATCH /promos/:id
  update(id: number | string, payload: Partial<Promo>) {
    return this.http.patch<Promo>(`${this.base}/${id}`, payload);
  }

  // DELETE /promos/:id
  delete(id: number | string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
