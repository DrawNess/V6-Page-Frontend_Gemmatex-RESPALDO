import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Offer } from '@shared/models/offer.model'; // o Product si reutilizas

@Injectable({
  providedIn: 'root'
})
export class OfferService {

  constructor() { }
  private http = inject(HttpClient);
  private base = 'http://gemmatex.store:3000/api/v1/offers'; // link directo

  getAll() {
    return this.http.get<Offer[]>(this.base);
  }

  getOne(id: string | number) {
    return this.http.get<Offer>(`${this.base}/${id}`);
  }
}
