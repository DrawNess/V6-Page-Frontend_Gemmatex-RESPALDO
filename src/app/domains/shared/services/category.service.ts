import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Category } from '@shared/models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoryService {
  private http = inject(HttpClient);

  constructor() { }

  getAll() {
    return this.http.get<Category[]>('http://31.97.164.171:3000/api/v1/categories');
  }
}
