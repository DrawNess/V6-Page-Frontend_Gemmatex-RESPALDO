import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Offer } from '@shared/models/offer.model'; // o Product si reutilizas
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class OfferService {

  constructor() { }
  private http = inject(HttpClient);
  private base = `${environment.API_URL}/offers`; // link directo

  getAll() {
    return this.http.get<Offer[]>(this.base);
  }

  getOne(id: string | number) {
    return this.http.get<Offer>(`${this.base}/${id}`);
  }
}
