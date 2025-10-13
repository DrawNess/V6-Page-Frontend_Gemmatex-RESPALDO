import { Category } from "./category.model";
export interface Subcategory {
    id: number;
    name: string;
    slug: string;
    description: string;
    image: string;
    createdAt: string;
    category: Category 
}
