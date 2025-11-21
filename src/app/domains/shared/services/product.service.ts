// src/app/shared/services/product.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private base = 'https://gemmatex.store/api/v1/products';

  constructor() { }
    // GET /products?categoryId=...
  getProducts(category_id?: string) {
    const url = new URL(this.base);
    if (category_id) {
      url.searchParams.set('categoryId', category_id);
    }
    return this.http.get<Product[]>(url.toString());
  }

    // GET /products/:id
  getOne(id: string) {
    return this.http.get<Product>(`${this.base}/${id}`);
  }
    // GET /products
  getAll() {
    return this.http.get<Product[]>(this.base);
  }

  getProductos() {
    return this.http.get<Product[]>(`https://gemmatex.store/api/v1/products`);
  }


  // PATCH /products/:id
  patchProduct(id: string | number, partial: Partial<Product> & Record<string, any>) {
    return this.http.patch<Product>(`${this.base}/${id}`, partial);
  }

  // DELETE /products/:id
  deleteProduct(id: string | number) {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
  // NEW: PATCH parcial (edición / activar / soft-delete)
}
