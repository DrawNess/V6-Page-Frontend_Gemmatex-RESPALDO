import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { HeroSlide } from '@shared/models/hero-slide.model';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class HeroSlideService {

  private http = inject(HttpClient);
  private base = `${environment.API_URL}/hero-slides`;
  private cache$: Observable<HeroSlide[]> | null = null;

  // GET /hero-slides — resultado cacheado por sesión
  getAll(params?: { activeNow?: boolean }) {
    if (!this.cache$) {
      const query = params?.activeNow ? '?activeNow=true' : '';
      this.cache$ = this.http.get<HeroSlide[]>(`${this.base}${query}`).pipe(
        shareReplay(1)
      );
    }
    return this.cache$;
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
