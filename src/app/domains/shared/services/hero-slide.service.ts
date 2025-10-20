import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { HeroSlide } from '@shared/models/hero-slide.model';

@Injectable({
  providedIn: 'root'
})
export class HeroSlideService {

  constructor() { }

  private http = inject(HttpClient);
  private base = 'http://localhost:3000/api/v1';

  getAll() {
    return this.http.get<HeroSlide[]>(`${this.base}/hero-slides`);
  }

}
