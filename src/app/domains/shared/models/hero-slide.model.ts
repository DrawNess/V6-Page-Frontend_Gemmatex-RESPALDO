// src/app/shared/models/hero-slide.model.ts
export interface HeroSlide {
  id: number;
  title?: string;
  subtitle?: string;
  description?: string;
  imageUrl: string;
  mobileImageUrl?: string ;
  ctaLabel?: string ;
  ctaUrl?: string ;
  background?: string;
  textColor?: string ;
  ordering?: number;
  is_active: boolean;
  startAt?: string;
  endAt?: string;
  hrefProductId?: number;
}
