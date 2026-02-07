import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Subcategory } from './../models/subcategory.model';
import { Product } from '@shared/models/product.model';
import { environment } from '@environments/environment';


@Injectable({
  providedIn: 'root'
})

export class SubcategoryService {

  private http = inject(HttpClient);
  private base = environment.API_URL;

  getAll() {
    return this.http.get<Subcategory[]>(`${this.base}/subcategories`);
  }

  getOne(id: string | number) {
    return this.http.get<Subcategory>(`${this.base}/subcategories/${id}`);
  }

  // /subcategories/:id/products (si lo tienes en tu API)
  getProductsBySubcategory(id: string | number) {
    return this.http.get<Product[]>(`${this.base}/subcategories/${id}/products`);
  }
  getByCategory(categoryId: string | number) {
    return this.http.get<Subcategory[]>(
      `${this.base}/categories/${categoryId}/subcategories`
    );
  }

}
// src/app/shared/services/subcategory.service.ts
// src/app/shared/services/subcategory.service.ts
