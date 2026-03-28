import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@environments/environment';
import { Variant } from '@shared/models/variant.model';

export interface CreateVariantDTO {
  productId: number;
  sku: string;
  colorId?: number | null;
  description: string;
  shortDescription: string;
  brand: string;
  imageUrl: string;
  galleryUrls?: string[];
  price: number;
  discountPrice?: number | null;
  stock: number;
  unitOfMeasure: string;
  dimensions: string;
  tags?: string[];
  outlet: boolean;
  is_active?: boolean;
}

@Injectable({ providedIn: 'root' })
export class VariantService {
  private http = inject(HttpClient);
  private readonly base = environment.API_URL;

  getVariantsByProduct(productId: number): Observable<Variant[]> {
    return this.http.get<Variant[]>(`${this.base}/products/${productId}/variants`);
  }

  createVariant(body: CreateVariantDTO): Observable<Variant> {
    return this.http.post<Variant>(`${this.base}/variants`, body);
  }

  updateVariant(id: number, partial: Partial<CreateVariantDTO>): Observable<Variant> {
    return this.http.patch<Variant>(`${this.base}/variants/${id}`, partial);
  }

  deleteVariant(id: number): Observable<{ id: number }> {
    return this.http.delete<{ id: number }>(`${this.base}/variants/${id}`);
  }

  bulkUpload(file: File, dryRun = true) {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ created?: number; updated?: number; errors?: unknown[] }>(
      `${this.base}/variants/bulk?dryRun=${dryRun}`, fd
    );
  }
}
