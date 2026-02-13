// src/app/shared/services/product.service.ts
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Product } from '../models/product.model';
import { environment } from '@environments/environment';
import { forkJoin, map, Observable, of, switchMap } from 'rxjs';

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
  private static readonly DEFAULT_PAGE_SIZE = 40;
  private http = inject(HttpClient);
  private base = `${environment.API_URL}/products`;

  constructor() { }

  private normalizePaginatedProducts(
    raw: PaginatedResponse<Product> | Product[],
    fallbackPage = 1,
    fallbackPageSize = ProductService.DEFAULT_PAGE_SIZE
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
      pageSize = ProductService.DEFAULT_PAGE_SIZE,
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
      .pipe(map((raw) => this.normalizePaginatedProducts(
        raw,
        Number(page) || 1,
        Number(pageSize) || ProductService.DEFAULT_PAGE_SIZE
      )));
  }

  // GET /products/search (paginado)
  searchProducts(params: ProductSearchParams): Observable<PaginatedResponse<Product>> {
    const {
      name,
      tag,
      page = 1,
      pageSize = ProductService.DEFAULT_PAGE_SIZE,
      page_size,
      limit,
      offset
    } = params;
    const query = this.buildParams({ name, tag, page, pageSize, page_size, limit, offset });
    const url = `${this.base}/search?${query.toString()}`;
    return this.http
      .get<PaginatedResponse<Product> | Product[]>(url)
      .pipe(map((raw) => this.normalizePaginatedProducts(
        raw,
        Number(page) || 1,
        Number(pageSize) || ProductService.DEFAULT_PAGE_SIZE
      )));
  }

  // búsqueda robusta: intenta por nombre y, si no hay resultados, reintenta por tag
  searchProductsByTerm(
    term: string,
    params: Omit<ProductSearchParams, 'name' | 'tag'> = {}
  ): Observable<PaginatedResponse<Product>> {
    const q = term.trim();
    if (!q) {
      return of(this.normalizePaginatedProducts(
        [],
        Number(params.page) || 1,
        Number(params.pageSize) || ProductService.DEFAULT_PAGE_SIZE
      ));
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

  private listAllProducts(params: Omit<ProductListParams, 'page' | 'pageSize' | 'page_size' | 'limit' | 'offset'> = {}) {
    return this.listProducts({
      ...params,
      page: 1,
      pageSize: ProductService.DEFAULT_PAGE_SIZE
    }).pipe(
      switchMap((first) => {
        const firstItems = first.data ?? [];
        const totalPages = Math.max(1, Number(first.meta?.totalPages ?? 1));
        if (totalPages <= 1) return of(firstItems);

        const requests: Observable<PaginatedResponse<Product>>[] = [];
        for (let p = 2; p <= totalPages; p++) {
          requests.push(
            this.listProducts({
              ...params,
              page: p,
              pageSize: ProductService.DEFAULT_PAGE_SIZE
            })
          );
        }

        return forkJoin(requests).pipe(
          map((pages) => {
            const rest = pages.flatMap((pg) => pg.data ?? []);
            return [...firstItems, ...rest];
          })
        );
      })
    );
  }

  // LEGACY COMPAT: devuelve array de productos
  getProducts(category_id?: string) {
    return this.listAllProducts({ categoryId: category_id });
  }

  // GET /products/:id
  getOne(id: string) {
    return this.http.get<Product>(`${this.base}/${id}`);
  }

  // LEGACY COMPAT: devuelve array de productos
  getAll() {
    return this.listAllProducts();
  }

  // LEGACY COMPAT: devuelve array de productos
  getProductos() {
    return this.listAllProducts();
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
