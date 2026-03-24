import { Color } from './color.model';

export interface Variant {
  id: number;
  productId: number;
  colorId: number | null;
  sku: string;
  price: string | number;
  discountPrice: string | number | null;
  stock: number;
  description: string;
  shortDescription: string;
  brand: string;
  imageUrl: string;
  galleryUrls: string[];
  unitOfMeasure: string;
  dimensions: string;
  tags: string[];
  outlet: boolean;
  is_active: boolean;
  color?: Color | null;
}
