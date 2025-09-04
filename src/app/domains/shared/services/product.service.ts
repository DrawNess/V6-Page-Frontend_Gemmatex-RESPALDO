import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private http = inject(HttpClient);

  constructor() { }

  getProducts(category_id?: string) {
    const url = new URL(`http://31.97.164.171:3000/api/v1/products`);
    if (category_id) {
      url.searchParams.set('categoryId', category_id);
    }
    return this.http.get<Product[]>(url.toString());
  }

  getOne(id: string) {
    return this.http.get<Product>(`http://31.97.164.171:3000/api/v1/products/${id}`);
  }
  getProductos() {
    return this.http.get<Product[]>(`http://31.97.164.171:3000/api/v1/products`);
  }
}
