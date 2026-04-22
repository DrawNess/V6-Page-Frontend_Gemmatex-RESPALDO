import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PromoService } from '@shared/services/promo.service';
import { Promo } from '@shared/models/promo.model';

const EXTERNAL_RE = /^(https?:\/\/|mailto:|tel:)/i;

@Component({
  selector: 'app-promo-carousel',
  imports: [NgTemplateOutlet, RouterLink],
  templateUrl: './promo-carousel.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PromoCarouselComponent implements OnInit {
  private promoService = inject(PromoService);
  private promos = signal<Promo[]>([]);

  readonly loading = signal(false);
  readonly error   = signal<string | null>(null);
  readonly current = signal(0);

  readonly active = computed(() => {
    const now = new Date();
    return this.promos()
      .filter(p => {
        if (!p.is_active) return false;
        return (!p.startAt || new Date(p.startAt) <= now) && (!p.endAt || new Date(p.endAt) >= now);
      })
      .sort((a, b) => (a.ordering ?? 9999) - (b.ordering ?? 9999));
  });

  ngOnInit() {
    this.loading.set(true);
    this.promoService.getAll({ activeNow: true }).subscribe({
      next: (items) => {
        this.promos.set(items ?? []);
        this.loading.set(false);
        if (this.current() >= this.active().length) this.current.set(0);
      },
      error: (err) => {
        console.error('Error cargando promos', err);
        this.error.set('No se pudieron cargar las promociones.');
        this.loading.set(false);
      }
    });
  }

  next() { const n = this.active().length; if (n) this.current.set((this.current() + 1) % n); }
  prev() { const n = this.active().length; if (n) this.current.set((this.current() - 1 + n) % n); }
  go(i: number) { if (i >= 0 && i < this.active().length) this.current.set(i); }

  promoRouterLink(p: Promo): string | null {
    const url = this.normalizeUrl(p.ctaUrl);
    if (url?.startsWith('/')) {
      if (url === '/productos') return p.hrefProductId ? `/product/${p.hrefProductId}` : url;
      return url;
    }
    if (!url && p.hrefProductId) return `/product/${p.hrefProductId}`;
    return null;
  }

  promoHref(p: Promo): string | null {
    const url = this.normalizeUrl(p.ctaUrl);
    return (!url || url.startsWith('/')) ? null : url;
  }

  private normalizeUrl(url?: string | null): string | null {
    const v = (url ?? '').trim();
    if (!v) return null;
    if (v.startsWith('/') || EXTERNAL_RE.test(v)) return v;
    if (/^(www\.|[a-z0-9-]+\.[a-z]{2,})(\/|$)/i.test(v)) return `https://${v}`;
    return null;
  }
}
