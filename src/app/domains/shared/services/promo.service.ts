// src/app/shared/services/promo.service.ts
import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Promo } from '@shared/models/promo.model';
import { environment } from '@environments/environment';

export interface PromoQuery {
  activeNow?: boolean;
  is_active?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PromoService {

  private http = inject(HttpClient);
  private base = `${environment.API_URL}/promos`;

  constructor() { }

  // GET /promos
  getAll(query?: PromoQuery) {
    let params = new HttpParams();
    if (query) {
      if (query.activeNow !== undefined) params = params.set('activeNow', String(query.activeNow));
      if (query.is_active !== undefined) params = params.set('is_active', String(query.is_active));
    }
    return this.http.get<Promo[]>(this.base, { params });
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
