import { ChangeDetectionStrategy, Component, OnDestroy, OnInit, Renderer2, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { HeroCarouselComponent } from './components/hero-carousel/hero-carousel.component';
import { AnnouncementsBarComponent } from './components/announcements-bar/announcements-bar.component';
import { ProductCarouselComponent } from './components/product-carousel/product-carousel.component';
import { PromoCarouselComponent } from './components/promo-carousel/promo-carousel.component';
import { StoreLocationComponent } from './components/store-location/store-location.component';
import { WhyChooseUsComponent } from './components/why-choose-us/why-choose-us.component';
import { BrandsMarqueeComponent } from './components/brands-marquee/brands-marquee.component';

@Component({
  selector: 'app-list',
  imports: [
    RouterLink,
    HeroCarouselComponent,
    AnnouncementsBarComponent,
    ProductCarouselComponent,
    PromoCarouselComponent,
    StoreLocationComponent,
    WhyChooseUsComponent,
    BrandsMarqueeComponent,
  ],
  templateUrl: './list.component.html',
  styleUrl: './list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export default class ListComponent implements OnInit, OnDestroy {
  private titleService = inject(Title);
  private meta         = inject(Meta);
  private doc          = inject(DOCUMENT);
  private renderer     = inject(Renderer2);
  private jsonLdScript: HTMLScriptElement | null = null;

  ngOnInit() {
    this.titleService.setTitle('Gemmatex — Distribuidor Autorizado de Insumos para Impresión en Bolivia');
    this.meta.updateTag({ name: 'description',        content: 'Gemmatex: distribuidor autorizado de tintas, impresoras, vinilos y suministros para impresión digital en Bolivia. Asesoría técnica, envíos a todo el país y soporte postventa.' });
    this.meta.updateTag({ name: 'keywords',           content: 'Gemmatex, tintas, impresoras, vinilo, impresión digital, DTF, UV, Bolivia, La Paz, insumos serigrafía' });
    this.meta.updateTag({ property: 'og:title',       content: 'Gemmatex — Insumos para Impresión en Bolivia' });
    this.meta.updateTag({ property: 'og:description', content: 'Distribuidor autorizado de tintas, impresoras y suministros para impresión digital. Envíos a todo Bolivia.' });
    this.meta.updateTag({ property: 'og:type',        content: 'website' });
    this.meta.updateTag({ property: 'og:url',         content: 'https://gemmatex.store' });
    this.meta.updateTag({ name: 'robots',             content: 'index, follow' });
    this.injectJsonLd();
  }

  ngOnDestroy() { this.removeJsonLd(); }

  private injectJsonLd() {
    const schema = {
      '@context': 'https://schema.org',
      '@type': 'LocalBusiness',
      name: 'Gemmatex',
      description: 'Distribuidor autorizado de tintas, impresoras, vinilos y suministros para impresión digital en Bolivia.',
      url: 'https://gemmatex.store',
      telephone: '+59162579602',
      address: {
        '@type': 'PostalAddress',
        streetAddress: 'Av. Illampu 682',
        addressLocality: 'La Paz',
        addressCountry: 'BO'
      },
      openingHoursSpecification: [
        { '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday','Tuesday','Wednesday','Thursday','Friday'], opens: '08:30', closes: '18:30' },
        { '@type': 'OpeningHoursSpecification', dayOfWeek: 'Saturday', opens: '08:30', closes: '13:00' }
      ]
    };
    this.jsonLdScript = this.renderer.createElement('script');
    this.jsonLdScript!.type = 'application/ld+json';
    this.jsonLdScript!.textContent = JSON.stringify(schema);
    this.renderer.appendChild(this.doc.head, this.jsonLdScript);
  }

  private removeJsonLd() {
    if (this.jsonLdScript) {
      this.renderer.removeChild(this.doc.head, this.jsonLdScript);
      this.jsonLdScript = null;
    }
  }
}
