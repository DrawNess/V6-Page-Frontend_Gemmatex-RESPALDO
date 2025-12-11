import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
/* import { RouterLink } from '@angular/router'; */
import { HttpClient } from '@angular/common/http';

import { OfferService } from '@shared/services/offer.service';
import { Offer } from '@shared/models/offer.model';
import { CartService } from '@shared/services/cart.service';

type SortKey = 'best' | 'discount' | 'priceAsc' | 'priceDesc';

type Category = { id: number; name: string; slug?: string };
type Subcategory = { id: number; name: string; slug?: string; categoryId?: number };

@Component({
    selector: 'app-offers',
    imports: [CommonModule, FormsModule],
    templateUrl: './offers.component.html',
    styleUrl: './offers.component.css'
})
export class OffersComponent {
private offerService = inject(OfferService);
  private cartService  = inject(CartService);
  private http         = inject(HttpClient);

  offers  = signal<Offer[]>([]);
  loading = signal<boolean>(true);
  error   = signal<string | null>(null);

  // filtros UI
  search      = signal<string>('');
  brand       = signal<string>('');  // '' = todas
  categoryId  = signal<string>('');  // id en string para <select>
  subcategoryId = signal<string>(''); // id en string
  inStock     = signal<boolean>(true);
  sortBy      = signal<SortKey>('best');

  // data de categorías/subcategorías
  categories  = signal<Category[]>([]);
  subcatsMap  = signal<Map<number, Subcategory[]>>(new Map());

  ngOnInit() {
    // 1) Ofertas
    this.offerService.getAll().subscribe({
      next: (items) => {
        this.offers.set(items ?? []);
        this.loading.set(false);
      },
      error: (err) => {
        console.error(err);
        this.error.set('No se pudieron cargar las ofertas.');
        this.loading.set(false);
      }
    });

    // 2) Categorías
    this.loadCategories();
  }

  // --- CATEGORÍAS / SUBCATEGORÍAS -----------------------------------------
  private loadCategories() {
    this.http.get<Category[]>('http://localhost:3000/api/v1/categories')
      .subscribe({
        next: (cats) => this.categories.set(cats ?? []),
        error: (e) => console.error('categories error', e)
      });
  }

  private loadSubcategories(catId: number) {
    // cache simple
    if (this.subcatsMap().has(catId)) return;
    this.http.get<Subcategory[]>(`http://localhost:3000/api/v1/categories/${catId}/subcategories`)
      .subscribe({
        next: (subs) => {
          const map = new Map(this.subcatsMap());
          map.set(catId, subs ?? []);
          this.subcatsMap.set(map);
        },
        error: (e) => console.error('subcategories error', e)
      });
  }

  onCategoryChange(val: string) {
    this.categoryId.set(val);
    this.subcategoryId.set(''); // reset subcat
    const id = Number(val);
    if (id) this.loadSubcategories(id);
  }

  currentSubcats = computed<Subcategory[]>(() => {
    const id = Number(this.categoryId());
    if (!id) return [];
    return this.subcatsMap().get(id) ?? [];
  });

  // --- MARCAS DISPONIBLES ---------------------------------------------------
  brands = computed<string[]>(() => {
    const set = new Set(
      this.offers().map(o => (o.brand ?? '').toString().trim()).filter(Boolean)
    );
    return Array.from(set).sort((a,b)=>a.localeCompare(b));
  });

  // --- UTILIDADES -----------------------------------------------------------
  private normalize(t: any): string {
    return (t ?? '')
      .toString()
      .toLowerCase()
      .normalize('NFD').replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-z0-9\s-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private haystack(o: Offer): string {
    return this.normalize([
      o.name, o.shortDescription, o.description, o.sku, ...(o.tags ?? [])
    ].filter(Boolean).join(' '));
  }

  // % de descuento
  discountPercent = (o: Offer): number => {
    const p = Number(o.price) || 0;
    const d = Number(o.discountPrice) || 0;
    if (!p || d <= 0 || d >= p) return 0;
    return Math.round(100 - (d * 100) / p);
  };

  // --- FILTRADO + ORDEN -----------------------------------------------------
  filtered = computed<Offer[]>(() => {
    const q       = this.normalize(this.search());
    const brand   = this.brand();
    const onlyStock = this.inStock();
    const catIdStr  = this.categoryId();
    const subIdStr  = this.subcategoryId();

    const cat = catIdStr ? this.categories().find(c => c.id === Number(catIdStr)) : undefined;
    const sub = subIdStr ? (this.subcatsMap().get(Number(catIdStr)) ?? []).find(s => s.id === Number(subIdStr)) : undefined;

    const catKey = cat ? this.normalize(cat.name) : '';
    const subKey = sub ? this.normalize(sub.name) : '';

    let data = this.offers().filter(o => {
      if (onlyStock && (o.stock ?? 0) <= 0) return false;
      if (brand && (o.brand ?? '').toLowerCase() !== brand.toLowerCase()) return false;

      const hay = this.haystack(o);

      if (q && !hay.includes(q)) return false;

      // Filtro por categoría (texto) si hay selección
      if (cat && !hay.includes(catKey)) return false;

      // Filtro por subcategoría (texto) si hay selección
      if (sub && !hay.includes(subKey)) return false;

      return true;
    });

    switch (this.sortBy()) {
      case 'discount':
        data = data.sort((a,b)=> this.discountPercent(b)-this.discountPercent(a));
        break;
      case 'priceAsc':
        data = data.sort((a,b)=> (a.discountPrice||a.price)-(b.discountPrice||b.price));
        break;
      case 'priceDesc':
        data = data.sort((a,b)=> (b.discountPrice||b.price)-(a.discountPrice||a.price));
        break;
      default:
        data = data.sort((a,b)=>{
          const d = this.discountPercent(b)-this.discountPercent(a);
          if (d !== 0) return d;
          return (b.stock||0)-(a.stock||0);
        });
    }
    return data;
  });

  // --- ACCIONES -------------------------------------------------------------
  addToCart(o: Offer) { this.cartService.addToCart(o as any); }

  waLink(o: Offer): string {
    const unit = (o.discountPrice && o.discountPrice > 0) ? o.discountPrice : o.price;
    const lines = [
      '*Consulta Oferta*',
      `Producto: ${o.name}`,
      `SKU: ${o.sku ?? '—'}`,
      `Precio oferta: ${unit.toLocaleString('es-BO',{style:'currency',currency:'BOB'})}`,
      `Stock: ${o.stock ?? 0}`,
      '',
      'Hola, me interesa esta oferta. ¿Me ayudan por favor?'
    ];
    const phone = '59170000001'; // cambia por el de tu sucursal
    return `https://wa.me/${phone}?text=${encodeURIComponent(lines.join('\n'))}`;
  }

  onImgError(e: Event) { (e.target as HTMLImageElement).src = '/assets/placeholders/product.webp'; }
  trackById = (_: number, o: Offer) => o.id ?? o.sku ?? _;



}
