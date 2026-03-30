import { Component, inject, signal, computed, effect, untracked, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { CartService, CartItem } from '../../services/cart.service';
import { Router, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs/operators';

import { CategoryService } from './../../services/category.service';
import { Category } from './../../models/category.model';

import { SubcategoryService } from '@shared/services/subcategory.service';
import { TokenService } from '@shared/services/token.service';
import { AuthService } from '@shared/services/auth.service';
import { ROUTE_CONSTANTS } from '@core/constants/routes.constants';


type HeaderCategory = Category;
type HeaderSubcategory = { id: number; name: string; slug?: string };


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CurrencyPipe, RouterLink],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent implements OnInit, OnDestroy {

  hideSideMenu = signal(true);
  private cartService = inject(CartService);
  cart = this.cartService.cart;
  total = this.cartService.total;
  searchOpen = signal(false);
  badgeBump = signal(false);
  cartPop = signal(false);
  private bumpTimer: ReturnType<typeof setTimeout> | null = null;
  private popTimer: ReturnType<typeof setTimeout> | null = null;
  private prevCount = signal<number>(0);
  readonly cartCount = computed(() => this.cart()?.length ?? 0);

  private readonly categorySvc = inject(CategoryService);
  private router = inject(Router);

  // ── User account menu ──────────────────────────────
  private tokenService = inject(TokenService);
  private authService = inject(AuthService);
  readonly userMenuOpen = signal(false);
  readonly isLoggedIn = computed(() => this.tokenService.isAuthenticated());
  readonly userRole = computed(() => this.tokenService.getRoleFromToken());
  readonly isAdmin = computed(() => this.userRole() === 'admin');

  toggleUserMenu() { this.userMenuOpen.update(v => !v); }
  closeUserMenu() { this.userMenuOpen.set(false); }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-user-menu]')) {
      this.userMenuOpen.set(false);
    }
  }

  logout() {
    this.authService.logout();
    this.closeUserMenu();
    this.router.navigate(['/']);
  }
  headerCategories = signal<Category[]>([]);

  toogleSideMenu() {
    this.hideSideMenu.update(prevState => !prevState);
  }

  toggleSearch() { this.searchOpen.update(v => !v); }
  closeSearch() { this.searchOpen.set(false); }

  private closeTimer: any = null;
  desktopMenuOpen = signal(false);

  toggleDesktopMenu() { this.desktopMenuOpen.update(v => !v); }
  closeDesktopMenu() { this.desktopMenuOpen.set(false); }

  removeFromCart(item: CartItem) { this.cartService.removeFromCart(item); }
  removeAllFromCart(item: CartItem) { this.cartService.removeAllFromCart(item); }

  private unitPrice(item: CartItem): number {
    return item.discountPrice ?? item.price;
  }

  groupedCart = computed(() => {
    const map = new Map<string, { product: CartItem; count: number; unitPrice: number }>();
    for (const item of this.cart()) {
      const key = String(item.variantId);
      const price = this.unitPrice(item);
      const cur = map.get(key);
      if (cur) cur.count += 1;
      else map.set(key, { product: item, count: 1, unitPrice: price });
    }
    return Array.from(map.values());
  });

  addOne(item: CartItem) {
    this.cartService.addToCart(item);
  }

  onSearch(q: string) {
    const query = (q || '').trim();
    if (!query) return;
    this.router.navigate(['/productos'], { queryParams: { q: query } });
    this.closeSearch();
  }


  ngOnInit() {
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        this.desktopMenuOpen.set(false);
        this.searchOpen.set(false);
        this.userMenuOpen.set(false);
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
  sheetOpen = signal(false);

  openSheet() { this.sheetOpen.set(true); document.body.style.overflow = 'hidden'; }
  closeSheet() { this.sheetOpen.set(false); document.body.style.overflow = ''; }

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
      const prev = untracked(() => this.prevCount());
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
