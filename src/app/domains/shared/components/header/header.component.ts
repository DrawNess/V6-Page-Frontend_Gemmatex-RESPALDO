import { Component, Input, SimpleChanges, inject, signal ,computed} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../models/product.model';
import { CartService } from '../../services/cart.service';
import { RouterLinkWithHref, RouterLinkActive } from '@angular/router';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLinkWithHref, RouterLinkActive],
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.css']
})
export class HeaderComponent {
  hideSideMenu = signal(true);
  private cartService = inject(CartService);
  cart = this.cartService.cart;
  total = this.cartService.total;

  toogleSideMenu() {
    this.hideSideMenu.update(prevState => !prevState);
  }

/* agregacion */

  openMenu: string | null = null;
  closeTimer: any = null;

  onEnter(menu: string) {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.openMenu = menu;
  }

  onLeave(menu: string) {
    this.closeTimer = setTimeout(() => {
      if (this.openMenu === menu) this.openMenu = null;
    }, 150);
  }

  toggleMenu(ev: Event, menu: string) {
    ev.preventDefault(); // soporte para móviles
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.openMenu = this.openMenu === menu ? null : menu;
  }

  // Opcional: mini-cart lateral
  toggleCart() {
    // tu lógica para abrir/cerrar el side-cart
  }
  // Número WhatsApp en formato internacional (sin +), ej. Bolivia: 5917XXXXXXX
  whatsAppPhone = '59171952341';

  waLink(): string {
    const lines = this.groupedCart().map(({ product, count, unitPrice }) => {
      const subtotal = (unitPrice * count).toFixed(2);
      return `• ${product.name} x${count} — Bs. ${subtotal}`;
    });

    const totalStr = (typeof this.total() === 'number')
      ? this.total().toFixed(2)
      : String(this.total());

    const message = `Hola, quiero hacer un pedido: ${lines.join('\n')}
    Total: Bs. ${totalStr}
    ¿Me ayuda con la compra?`

    return `https://wa.me/${this.whatsAppPhone}?text=${encodeURIComponent(message)}`;
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
  // Si usas CartService:
  this.cartService.addToCart(p);

  // ---- Alternativa SIN servicio (si prefieres manipular el signal directamente) ----
  // this.cart.set([...this.cart(), p]);
}
private router = inject(Router);
  onSearch(q: string) {
    const query = (q || '').trim();
    if (!query) return;
    this.router.navigate(['/catalogo'], { queryParams: { q: query } });
    this.openMenu = null; // cierra menús si estaban abiertos
  }




// Texto comercial
mensaje = 'NO SOLO TE VENDEMOS EL PRODUCTO, TE ENSEÑAMOS A UTILIZARLO.';
chars: string[] = Array.from(this.mensaje);

// Control de animación
animate = false;
private loopTimer: any;


ngOnInit() {
  // primer disparo
  setTimeout(() => this.animate = true, 50);

  // opcional: repetir en bucle para “vida” constante
  this.loopTimer = setInterval(() => {
    this.animate = false;               // resetea a estado inicial
    setTimeout(() => this.animate = true, 60); // dispara otra vez
  }, 8000); // cada 8s
  
  this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => {
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 0);
      });
}

ngOnDestroy() {
  if (this.loopTimer) clearInterval(this.loopTimer);
}




// Estado
isMegaOpen = false;
panelHover = false;
activeCat: 'EPSON' = 'EPSON';

// Orden: marcas primero
cats = [
  { key: 'EPSON',       label: 'EPSON' },
] as const;

subsMap: Record<typeof this.activeCat, Array<{ label: string; link: any[]; desc?: string }>> = {
  EPSON: [
    { label: 'Impresora de sublimacion',                link: ['/catalogo'],                 desc: '' },
    { label: 'Impresora DTF',              link: ['/catalogo'],               desc: '' },
    { label: 'Impresora de Graficos Tecnicos CAD',                   link: ['/catalogo'],                    desc: '' },
    { label: 'Impresora de Etiquetas', link: ['/catalogo'],    desc: '' },
    { label: 'Punto de venta',    link: ['/catalogo'],       desc: '' },
    { label: 'Equipos Especializados',    link: ['/catalogo'],       desc: '' },
  ]/* ,
  sublimacion: [
    { label: 'Impresoras Epson',     link: ['/categoria/impresoras-sublimacion'], desc: 'EcoTank y fotográficas listas para subli.' },
    { label: 'Planchas térmicas',    link: ['/categoria/planchas'],                desc: 'Planas, tazas y multifunción.' },
    { label: 'Calandras',            link: ['/categoria/calandras'],               desc: 'Producción continua en rollo.' },
    { label: 'Tintas',               link: ['/categoria/tintas'],                  desc: 'Formulaciones estables y vibrantes.' },
    { label: 'Papel de sublimación', link: ['/categoria/papel-sublimacion'],      desc: 'Secado rápido, alta transferencia.' },
  ],
  serigrafia: [
    { label: 'Maquinaria', link: ['/categoria/serigrafia-maquinaria'], desc: 'Pulpos, hornos y más.' },
    { label: 'Tintas',     link: ['/categoria/serigrafia-tintas'],     desc: 'Plastisol, base agua, aditivos.' },
    { label: 'Auxiliares', link: ['/categoria/serigrafia-auxiliares'], desc: 'Emulsiones, removedores, químicos.' },
  ],
  vinil: [
    { label: 'Vinil textil',  link: ['/categoria/vinil-textil'], desc: 'PU, glitter, flúor y especiales.' },
    { label: 'Gran formato',  link: ['/categoria/gran-formato'], desc: 'Lonas, microperforado, backlit.' },
    { label: 'Publicidad',    link: ['/categoria/publicidad'],   desc: 'Sustratos y displays.' },
    { label: 'Ofertas',       link: ['/ofertas'],                desc: 'Liquidaciones y combos.' },
  ] */,
};

// Métodos
  toggleMega(ev: MouseEvent) {
    ev.preventDefault(); // no navegar, abrir/cerrar panel
    this.isMegaOpen = !this.isMegaOpen;
  }
  
  closeMega() { this.isMegaOpen = false; }
  setActive(key: typeof this.activeCat) { this.activeCat = key; }
  visibleSubs() { return this.subsMap[this.activeCat] ?? []; }

  // Trackers
  trackKey = (_: number, c: any) => c.key;
  trackLabel = (_: number, s: any) => s.label;

  onItemClick(ev: MouseEvent, link: any[]) {
    ev.preventDefault();

    const el = ev.currentTarget as HTMLElement;
    if (!el) { this.router.navigate(link); return; }

    // Evita doble click durante la animación
    el.style.pointerEvents = 'none';

    // Altura actual para animar colapso suave
    const rect = el.getBoundingClientRect();
    el.style.height = rect.height + 'px';
    // Forzamos un reflow para que el browser “fije” la altura antes de transicionar
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight;

    // Transiciones suaves
    el.style.transition = 'transform 320ms ease, opacity 320ms ease, height 320ms ease, margin 320ms ease, padding 320ms ease';
    el.style.transform = 'translateY(-16px)'; // se “sube” un poco
    el.style.opacity = '0';
    el.style.height = '0px';
    el.style.marginTop = '0';
    el.style.marginBottom = '0';
    el.style.paddingTop = '0';
    el.style.paddingBottom = '0';

    // Cerrar panel y navegar tras la animación
    setTimeout(() => {
      this.closeMega();
      this.router.navigate(link);
    }, 330);
  }





  /** Sheet (menú móvil estilo Apple) */
sheetOpen = false;
sheetCatOpen = true; // abre Catálogo por defecto

openSheet() { this.sheetOpen = true; document.body.style.overflow = 'hidden'; }
closeSheet() { this.sheetOpen = false; this.sheetCatOpen = true; document.body.style.overflow = ''; }
toggleSheetCatalog() { this.sheetCatOpen = !this.sheetCatOpen; }


get visibleSubsArr() { return this.subsMap[this.activeCat] ?? []; }



 
}
