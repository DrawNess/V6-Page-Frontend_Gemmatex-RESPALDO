import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HeroSlide } from '@shared/models/hero-slide.model';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HeroSlideService {

  constructor() { }

  private http = inject(HttpClient);
  private base = `${environment.API_URL}/hero-slides`;

/*   getAll() {
    return this.http.get<HeroSlide[]>(`${this.base}/hero-slides`);
  } */
    // GET /hero-slides
  // (Opcional: puedes pasar { activeNow: true } si algún día lo usas)
  getAll(params?: { activeNow?: boolean }) {
    const query = params?.activeNow ? '?activeNow=true' : '';
    return this.http.get<HeroSlide[]>(`${this.base}${query}`);
  }
    // GET /hero-slides/:id
  getOne(id: number | string) {
    return this.http.get<HeroSlide>(`${this.base}/${id}`);
  }

  // POST /hero-slides
  create(payload: Partial<HeroSlide>) {
    return this.http.post<HeroSlide>(this.base, payload);
  }

  // PATCH /hero-slides/:id
  update(id: number | string, payload: Partial<HeroSlide>) {
    return this.http.patch<HeroSlide>(`${this.base}/${id}`, payload);
  }

  // DELETE /hero-slides/:id
  delete(id: number | string) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
