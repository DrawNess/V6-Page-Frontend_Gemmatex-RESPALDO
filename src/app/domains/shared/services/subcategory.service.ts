import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Subcategory } from './../models/subcategory.model';
import { Product } from '@shared/models/product.model';


@Injectable({
  providedIn: 'root'
})

export class SubcategoryService {

  private http = inject(HttpClient);

  getAll() {
    return this.http.get<Subcategory[]>('http://gemmatex.store:3000/api/v1/subcategories');
  }

  getOne(id: string | number) {
    return this.http.get<Subcategory>(`http://gemmatex.store:3000/api/v1/subcategories/${id}`);
  }

  // /subcategories/:id/products (si lo tienes en tu API)
  getProductsBySubcategory(id: string | number) {
    return this.http.get<Product[]>(`http://gemmatex.store:3000/api/v1/subcategories/${id}/products`);
  }
  getByCategory(categoryId: string | number) {
    return this.http.get<Subcategory[]>(
      `http://gemmatex.store:3000/api/v1/categories/${categoryId}/subcategories`
    );
  }

}
// src/app/shared/services/subcategory.service.ts
// src/app/shared/services/subcategory.service.ts

