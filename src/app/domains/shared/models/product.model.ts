import { Category } from "./category.model";

export interface Product {

    /* id: number;
    title: string;
    description: string;
    price: number;
    images: string[];
    creationAt: string; */
  id: number;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  subcategory: string;
  imageUrl: string;
  galleryUrls: string[];
  price: number;
  discountPrice: number;
  sku: string;
  stock: number;
  unitOfMeasure: number;
  dimensions: number;
  tags: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  /* category: Category; */
  category: 1;
}
