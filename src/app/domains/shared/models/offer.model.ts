// src/app/shared/models/offer.model.ts
export interface Offer {
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  brand: string;
  imageUrl: string;
  galleryUrls: string[];
  price: number;
  discountPrice: number;
  sku: string;
  stock: number;
  unitOfMeasure: string;
  dimensions: string;
  tags: string[];
  outlet: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}
