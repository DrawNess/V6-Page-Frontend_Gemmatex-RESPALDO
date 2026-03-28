import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Subcategory } from './../models/subcategory.model';
import { Product } from '@shared/models/product.model';
import { environment } from '@environments/environment';
import { map, Observable } from 'rxjs';
import { PaginatedResponse } from './product.service';

type SubcategoryProductsParams = {
  page?: number;
  pageSize?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
};


@Injectable({
  providedIn: 'root'
})

export class SubcategoryService {

  private static readonly DEFAULT_PAGE_SIZE = 40;
  private http = inject(HttpClient);
  private base = environment.API_URL;

  getAll() {
    return this.http.get<Subcategory[]>(`${this.base}/subcategories`);
  }

  getOne(id: string | number) {
    return this.http.get<Subcategory>(`${this.base}/subcategories/${id}`);
  }

  private buildParams(params: Record<string, string | number | null | undefined>): URLSearchParams {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      q.set(k, String(v));
    });
    return q;
  }

  private normalizePaginatedProducts(
    raw: PaginatedResponse<Product> | Product[],
    fallbackPage = 1,
    fallbackPageSize = SubcategoryService.DEFAULT_PAGE_SIZE
  ): PaginatedResponse<Product> {
    if (Array.isArray(raw)) {
      const count = raw.length;
      return {
        data: raw,
        meta: {
          totalItems: count,
          itemCount: count,
          page: fallbackPage,
          pageSize: fallbackPageSize,
          totalPages: count > 0 ? 1 : 0,
          hasNextPage: false,
          hasPrevPage: false,
          nextPage: null,
          prevPage: null
        }
      };
    }

    return {
      data: Array.isArray(raw?.data) ? raw.data : [],
      meta: raw?.meta ?? {
        totalItems: 0,
        itemCount: 0,
        page: fallbackPage,
        pageSize: fallbackPageSize,
        totalPages: 0,
        hasNextPage: false,
        hasPrevPage: false,
        nextPage: null,
        prevPage: null
      }
    };
  }

  getProductsBySubcategory(
    id: string | number,
    params: SubcategoryProductsParams = {}
  ): Observable<PaginatedResponse<Product>> {
    const {
      page = 1,
      pageSize = SubcategoryService.DEFAULT_PAGE_SIZE,
      page_size,
      limit,
      offset
    } = params;

    const query = this.buildParams({ page, pageSize, page_size, limit, offset });
    const url = `${this.base}/subcategories/${id}/products${query.toString() ? `?${query.toString()}` : ''}`;
    return this.http
      .get<PaginatedResponse<Product> | Product[]>(url)
      .pipe(map((raw) => this.normalizePaginatedProducts(
        raw,
        Number(page) || 1,
        Number(pageSize) || SubcategoryService.DEFAULT_PAGE_SIZE
      )));
  }
  getByCategory(categoryId: string | number) {
    return this.http.get<Subcategory[]>(
      `${this.base}/categories/${categoryId}/subcategories`
    );
  }

  create(body: Partial<Subcategory>) {
    return this.http.post<Subcategory>(`${this.base}/subcategories`, body);
  }

  update(id: string | number, body: Partial<Subcategory>) {
    return this.http.patch<Subcategory>(`${this.base}/subcategories/${id}`, body);
  }

  delete(id: string | number) {
    return this.http.delete<void>(`${this.base}/subcategories/${id}`);
  }
}
