import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Category } from '@shared/models/category.model';
import { Product } from '@shared/models/product.model';
import { environment } from '@environments/environment';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);
  private base = environment.API_URL;

  constructor() { }
//https://gemmatex.store/api/v1/categories
  getAll() {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }
    getOne(id: string | number) {
    return this.http.get<Category>(`${this.base}/categories/${id}`);
  }

  getProductsByCategory(id: string | number) {
    return this.http.get<Product[]>(`${this.base}/categories/${id}/products`);
  }

  getByCategory(categoryId: string | number) {
    return this.http.get<Category[]>(
      `${this.base}/categories/${categoryId}/subcategories`
    );
  }

}
