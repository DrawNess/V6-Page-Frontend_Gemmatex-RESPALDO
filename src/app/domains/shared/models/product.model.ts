import { Subcategory } from './subcategory.model';
import { Variant } from './variant.model';

export interface Product {
  id: number;
  name: string;
  slug: string;
  brand: string;
  imageUrl: string;
  is_active: boolean;
  subcategoryId?: number;
  subcategory?: Subcategory;
  variants?: Variant[];
}
