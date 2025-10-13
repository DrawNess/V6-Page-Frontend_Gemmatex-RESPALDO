/* import { Subcategory } from "@shared/services/subcategory.service"; */
import { Subcategory } from "./subcategory.model";

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
  brand: string;
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
  subcategory: Subcategory;
  /* category: 1; */
}
