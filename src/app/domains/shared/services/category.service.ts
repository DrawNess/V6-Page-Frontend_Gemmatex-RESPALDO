import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Category } from '@shared/models/category.model';
import { Product } from '@shared/models/product.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);

  constructor() { }
//https://gemmatex.store/api/v1/categories
  getAll() {
    return this.http.get<Category[]>('http://localhost:3000/api/v1/categories');
  }
    getOne(id: string | number) {
    return this.http.get<Category>(`http://localhost:3000/api/v1/categories/${id}`);
  }


  getProductsByCategory(id: string | number) {
    return this.http.get<Product[]>(`http://localhost:3000/api/v1/categories/${id}/products`);
  }

  getByCategory(categoryId: string | number) {
    return this.http.get<Category[]>(
      `http://localhost:3000/api/v1/categories/${categoryId}/subcategories`
    );
  }

}