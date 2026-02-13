// src/app/shared/services/product.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { environment } from '@environments/environment';
import { map, Observable, of, switchMap } from 'rxjs';

export interface PaginationMeta {
  totalItems: number;
  itemCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  nextPage: number | null;
  prevPage: number | null;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
  categoryId?: string | number;
  price?: number;
  price_min?: number;
  price_max?: number;
}

export interface ProductSearchParams {
  name?: string;
  tag?: string;
  page?: number;
  pageSize?: number;
  page_size?: number;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);
  private base = `${environment.API_URL}/products`;

  constructor() { }

  private normalizePaginatedProducts(
    raw: PaginatedResponse<Product> | Product[],
    fallbackPage = 1,
    fallbackPageSize = 40
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

  private buildParams(params: Record<string, string | number | null | undefined>): URLSearchParams {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v === undefined || v === null || v === '') return;
      q.set(k, String(v));
    });
    return q;
  }

  // GET /products (paginado)
  listProducts(params: ProductListParams = {}): Observable<PaginatedResponse<Product>> {
    const {
      page = 1,
      pageSize = 40,
      categoryId,
      page_size,
      limit,
      offset,
      price,
      price_min,
      price_max
    } = params;

    const query = this.buildParams({
      page,
      pageSize,
      page_size,
      limit,
      offset,
      categoryId,
      price,
      price_min,
      price_max
    });
    const url = query.toString() ? `${this.base}?${query.toString()}` : this.base;

    return this.http
      .get<PaginatedResponse<Product> | Product[]>(url)
      .pipe(map((raw) => this.normalizePaginatedProducts(raw, Number(page) || 1, Number(pageSize) || 40)));
  }

  // GET /products/search (paginado)
  searchProducts(params: ProductSearchParams): Observable<PaginatedResponse<Product>> {
    const { name, tag, page = 1, pageSize = 40, page_size, limit, offset } = params;
    const query = this.buildParams({ name, tag, page, pageSize, page_size, limit, offset });
    const url = `${this.base}/search?${query.toString()}`;
    return this.http
      .get<PaginatedResponse<Product> | Product[]>(url)
      .pipe(map((raw) => this.normalizePaginatedProducts(raw, Number(page) || 1, Number(pageSize) || 40)));
  }

  // búsqueda robusta: intenta por nombre y, si no hay resultados, reintenta por tag
  searchProductsByTerm(
    term: string,
    params: Omit<ProductSearchParams, 'name' | 'tag'> = {}
  ): Observable<PaginatedResponse<Product>> {
    const q = term.trim();
    if (!q) {
      return of(this.normalizePaginatedProducts([], Number(params.page) || 1, Number(params.pageSize) || 40));
    }

    return this.searchProducts({ ...params, name: q }).pipe(
      switchMap((res) => {
        if ((res.data?.length ?? 0) > 0) return of(res);
        return this.searchProducts({ ...params, tag: q });
      })
    );
  }

  // GET /products/:id/related?limit=...
  getRelatedProducts(id: string | number, limit = 8): Observable<Product[]> {
    const query = this.buildParams({ limit });
    const url = `${this.base}/${id}/related${query.toString() ? `?${query.toString()}` : ''}`;
    return this.http
      .get<{ data?: Product[] } | Product[]>(url)
      .pipe(map((raw) => (Array.isArray(raw) ? raw : (raw?.data ?? []))));
  }

  // LEGACY COMPAT: devuelve array de productos
  getProducts(category_id?: string) {
    return this.listProducts({ page: 1, pageSize: 100, categoryId: category_id })
      .pipe(map((res) => res.data ?? []));
  }

  // GET /products/:id
  getOne(id: string) {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

  // LEGACY COMPAT: devuelve array de productos
  getAll() {
    return this.listProducts({ page: 1, pageSize: 100 })
      .pipe(map((res) => res.data ?? []));
  }

  // LEGACY COMPAT: devuelve array de productos
  getProductos() {
    return this.listProducts({ page: 1, pageSize: 100 })
      .pipe(map((res) => res.data ?? []));
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
