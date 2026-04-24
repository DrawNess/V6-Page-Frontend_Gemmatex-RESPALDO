import {
  ChangeDetectionStrategy, Component, DestroyRef, OnInit,
  computed, inject, signal
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../../../../environments/environment';

interface Branch {
  label: string;
  city: string;
  address: string;
  wsp: string;
  mapSrc: string;
}

const INTERVAL_MS = 5000;

@Component({
  selector: 'app-store-location',
  imports: [RouterLink],
  templateUrl: './store-location.component.html',
  styleUrl: './store-location.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StoreLocationComponent implements OnInit {
  private sanitizer = inject(DomSanitizer);
  private destroyRef = inject(DestroyRef);

  readonly branches: Branch[] = [
    {
      label: 'La Paz',
      city: 'Casa Matriz · La Paz',
      address: 'Av. Illampu esq. Graneros N.º 682',
      wsp: String(environment.WSP_LPZ),
      mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3825.6132700067697!2d-68.1403112!3d-16.495108599999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915f2075ab61618b%3A0x9cb53130882cfa67!2sGEMMATEX!5e0!3m2!1ses!2sbo!4v1735051509160!5m2!1ses!2sbo'
    },
    {
      label: 'El Alto Ceibo',
      city: 'El Alto · Ceibo',
      address: 'Zona 16 de Julio – Calle René Dorado N.º 200',
      wsp: String(environment.WSP_EACEIBO),
      mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3825.4695632032794!2d-68.1633219!3d-16.5023753!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x915edf967a722d31%3A0x4020b165425a47de!2sGemmatex!5e0!3m2!1ses!2sbo!4v1735053585249!5m2!1ses!2sbo'
    },
    {
      label: 'El Alto Satélite',
      city: 'El Alto · Ciudad Satélite',
      address: 'Av. Panorámica – frente al canal RTP, cerca del teleférico plateado',
      wsp: String(environment.WSP_EASATE),
      mapSrc: 'https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3825.0605447215084!2d-68.1510048248543!3d-16.523040784224154!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTbCsDMxJzIzLjAiUyA2OMKwMDgnNTQuNCJX!5e0!3m2!1sen!2sbo!4v1735053665686!5m2!1sen!2sbo'
    },
    {
      label: 'Cochabamba',
      city: 'Cochabamba',
      address: 'Av. Aroma entre calle 16 de Julio y Av. Oquendo',
      wsp: String(environment.WSP_CBBA),
      mapSrc: 'https://www.google.com/maps/embed?pb=!1m13!1m8!1m3!1d951.8187707662681!2d-66.14997569384845!3d-17.398581457581937!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTfCsDIzJzU0LjgiUyA2NsKwMDgnNTcuNyJX!5e0!3m2!1ses!2sbo!4v1735052191743!5m2!1ses!2sbo'
    },
    {
      label: 'Santa Cruz',
      city: 'Santa Cruz',
      address: 'Calle Isabel la Católica casi Cañoto, lado Kaywasi N.º 275',
      wsp: String(environment.WSP_SCZ),
      mapSrc: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d671.5871732961211!2d-63.18776779504998!3d-17.7883714862721!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x93f1e932b88ff49f%3A0xdee91d7a7157cc17!2sGemmatex!5e0!3m2!1sen!2sbo!4v1735053796329!5m2!1sen!2sbo'
    }
  ];

  /** SafeResourceUrl pre-computadas — no re-sanitiza en cada render */
  readonly safeMaps: SafeResourceUrl[] = this.branches.map(b =>
    this.sanitizer.bypassSecurityTrustResourceUrl(b.mapSrc)
  );

  selected    = signal(0);
  slideDir    = signal<'next' | 'prev'>('next');
  progressKey = signal(0);

  active      = computed(() => this.branches[this.selected()]);
  safeMap     = computed(() => this.safeMaps[this.selected()]);
  /** Clave única para @for — fuerza recreación del panel al cambiar */
  panelKey    = computed(() => `${this.selected()}-${this.slideDir()}`);
  infoClass   = computed(() =>
    this.slideDir() === 'next' ? 'slide-in-right' : 'slide-in-left'
  );

  private timer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.destroyRef.onDestroy(() => clearInterval(this.timer));
  }

  ngOnInit(): void {
    this.startTimer();
  }

  private startTimer(): void {
    clearInterval(this.timer);
    this.timer = setInterval(() => this.advance('next'), INTERVAL_MS);
  }

  private advance(dir: 'next' | 'prev'): void {
    const len = this.branches.length;
    this.slideDir.set(dir);
    this.selected.update(i =>
      dir === 'next' ? (i + 1) % len : (i - 1 + len) % len
    );
    this.progressKey.update(k => k + 1);
  }

  select(i: number): void {
    if (i === this.selected()) return;
    this.advance(i > this.selected() ? 'next' : 'prev');
    this.selected.set(i);
    this.startTimer();
  }

  wspLink(n: string): string {
    return `https://api.whatsapp.com/send?phone=591${n.replace(/\D/g, '')}`;
  }
}
