// src/app/shared/models/promo.model.ts
export interface Promo {
  id: number;
  title?: string ;
  description?: string;
  imageUrl: string;
  ctaLabel?: string;
  ctaUrl?: string;
  background?: string;
  textColor?: string;
  ordering?: number;
  is_active: boolean;
  startAt?: string;
  endAt?: string;
  hrefProductId?: number;
}