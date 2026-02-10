import { Component, inject, signal, computed, effect, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

import { CategoryService } from './../../services/category.service';
import { Category } from './../../models/category.model';

import { SubcategoryService } from '@shared/services/subcategory.service';


type HeaderCategory = Category;
type HeaderSubcategory = { id: number; name: string; slug?: string };


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnDestroy {

  hideSideMenu = signal(true);
  private cartService = inject(CartService);
  cart = this.cartService.cart;
  total = this.cartService.total;
  searchOpen = false;
  badgeBump = signal(false);
  cartPop = signal(false);
  private bumpTimer: ReturnType<typeof setTimeout> | null = null;
  private popTimer: ReturnType<typeof setTimeout> | null = null;
  private prevCount = signal<number>(0);
  readonly cartCount = computed(() => this.cart()?.length ?? 0);

  private readonly categorySvc = inject(CategoryService);
  private router = inject(Router);
  headerCategories = signal<Category[]>([]);

  toogleSideMenu() {
    this.hideSideMenu.update(prevState => !prevState);
  }

  toggleSearch() {
    this.searchOpen = !this.searchOpen;
  }
  closeSearch() {
    this.searchOpen = false;
  }

  private closeTimer: any = null;
  desktopMenuOpen = false;

  toggleDesktopMenu() {
    this.desktopMenuOpen = !this.desktopMenuOpen;
  }

  closeDesktopMenu() {
    this.desktopMenuOpen = false;
  }
  // Tip opcional (ajusta a tu modelo real)
  private keyOf(p: any): string {
    return String(p?.id ?? p?.slug);
  }
  removeFromCart(product: any) {
    const key = this.keyOf(product);
    let removed = false;
    this.cart.set(
      this.cart().filter(item => {
        if (!removed && this.keyOf(item) === key) {
          removed = true;               // elimina solo una
          return false;
        }
        return true;
      })
    );
  }
  removeAllFromCart(product: any) {
    const key = this.keyOf(product);
    this.cart.set(this.cart().filter(item => this.keyOf(item) !== key));
  }
/* ---------------- */
  private unitPrice(p: Product): number {
    const d = Number(p.discountPrice);
    const base = Number(p.price);
    return !isNaN(d) && d > 0 ? d : base;
  }
  /* Agrupar items */
  groupedCart = computed(() => {
    const map = new Map<string, { product: Product; count: number; unitPrice: number }>();

    for (const p of this.cart()) {
      const key = String(p?.id ?? p?.slug);
      const price = this.unitPrice(p);
      const cur = map.get(key);
      if (cur) {
        cur.count += 1;
      } else {
        map.set(key, { product: p, count: 1, unitPrice: price });
      }
    }
    return Array.from(map.values());
  });
  // Suma una unidad del mismo producto
  addOne(p: Product) {
    this.cartService.addToCart(p);
    // Alternativa: manipular el signal directamente
    // this.cart.set([...this.cart(), p]);
  }

  onSearch(q: string) {
    const query = (q || '').trim();
    if (!query) return;
    this.router.navigate(['/catalogo'], { queryParams: { q: query } });
  }


  ngOnInit() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.desktopMenuOpen = false;
        this.searchOpen = false;
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 0);
      });
    this.categorySvc.getAll().subscribe({
      next: (cats) => this.headerCategories.set(cats ?? []),
      error: () => this.headerCategories.set([]),
    });
  }
/** Sheet (menú móvil estilo Apple) */
  sheetOpen = false;

  openSheet() { this.sheetOpen = true; document.body.style.overflow = 'hidden'; }
  closeSheet() { this.sheetOpen = false; document.body.style.overflow = ''; }

  trackByCat = (_: number, c: Category) => c.id;

  private subcatSrv = inject(SubcategoryService);

  // estado para el dropdown
  openCatId: number | null = null;
  subcatsMap = new Map<number, HeaderSubcategory[]>();
  subcatsLoading = false;

  // abrir y precargar subcategorías
  openCat(cat: HeaderCategory) {
    this.cancelClose(); // evita flicker al mover el puntero
    this.openCatId = cat.id;
    if (!this.subcatsMap.has(cat.id)) {
      this.subcatsLoading = true;
      this.subcatSrv.getByCategory(cat.id).subscribe({
        next: (arr) => {
          this.subcatsMap.set(cat.id, arr ?? []);
          this.subcatsLoading = false;
        },
        error: () => {
          this.subcatsMap.set(cat.id, []);
          this.subcatsLoading = false;
        }
      });
    }
  }

  cancelClose() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }

  closeCatDelayed() {
    this.cancelClose();
    this.closeTimer = setTimeout(() => {
      this.openCatId = null;
    }, 240); // da margen al pasar entre botones/panel
  }

  // navegación
  goToCategory(cat?: HeaderCategory | null) {
    if (!cat) return;
    this.router.navigate(['/productos'], { queryParams: { categoryId: cat.id } });
  }
  goToSubcategory(cat: HeaderCategory | null | undefined, sc: HeaderSubcategory) {
    if (!cat) return;
    this.router.navigate(['/productos'], { queryParams: { categoryId: cat.id, subcategoryId: sc.id } });
    this.openCatId = null;
  }

  accordionOpenId: number | null = null;

  toggleCatAccordion(cat: HeaderCategory) {
    this.accordionOpenId = this.accordionOpenId === cat.id ? null : cat.id;
    if (!this.subcatsMap.has(cat.id)) {
      this.subcatsLoading = true;
      this.subcatSrv.getByCategory(cat.id).subscribe({
        next: (arr) => {
          this.subcatsMap.set(cat.id, arr ?? []);
          this.subcatsLoading = false;
        },
        error: () => {
          this.subcatsMap.set(cat.id, []);
          this.subcatsLoading = false;
        }
      });
    }
  }

  getCurrentCategory() {
    return this.headerCategories().find(cat => cat.id === this.openCatId);
  }

  closeCat() {
    this.openCatId = null;
  }

  private triggerCartFeedback() {
    this.badgeBump.set(false);
    this.cartPop.set(false);
    if (this.bumpTimer) clearTimeout(this.bumpTimer);
    if (this.popTimer) clearTimeout(this.popTimer);

    // next frame para reiniciar animación
    requestAnimationFrame(() => {
      this.badgeBump.set(true);
      this.cartPop.set(true);
      this.bumpTimer = setTimeout(() => this.badgeBump.set(false), 450);
      this.popTimer = setTimeout(() => this.cartPop.set(false), 900);
    });
  }

  constructor() {
    effect(() => {
      const current = this.cartCount();
      const prev = this.prevCount();
      if (current > prev) {
        this.triggerCartFeedback();
      }
      this.prevCount.set(current);
    });
  }

  ngOnDestroy(): void {
    if (this.bumpTimer) clearTimeout(this.bumpTimer);
    if (this.popTimer) clearTimeout(this.popTimer);
  }
}
