import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';

@Injectable({
  providedIn: 'root'
})
export class ProductService {

  private http = inject(HttpClient);

  constructor() { }
//https://gemmatex.store/api/v1/products
  getProducts(category_id?: string) {
    const url = new URL(`http://localhost:3000/api/v1/products`);
    if (category_id) {
      url.searchParams.set('categoryId', category_id);
    }
    return this.http.get<Product[]>(url.toString());
  }

  getOne(id: string) {
    return this.http.get<Product>(`http://localhost:3000/api/v1/products/${id}`);
  }
  getProductos() {
    return this.http.get<Product[]>(`http://localhost:3000/api/v1/products`);
  }
  private base = 'http://localhost:3000/api/v1/products';
  
  // NEW: PATCH parcial (edición / activar / soft-delete)
  patchProduct(id: string | number, partial: Partial<Product> & Record<string, any>) {
    return this.http.patch<Product>(`${this.base}/products/${id}`, partial);
  }
}


