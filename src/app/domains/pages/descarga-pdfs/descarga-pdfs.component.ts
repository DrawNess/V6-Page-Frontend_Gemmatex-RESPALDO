import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

type PdfDoc = { file: string; title?: string; brand?: 'EPSON'|'FREESUB'|'GX'|'VINILES'|'SERIGRAFIA'|'AGABE'|'DTF-UV'|'OTROS'; image?: string; };

@Component({
  selector: 'app-descarga-pdfs',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './descarga-pdfs.component.html',
  styleUrl: './descarga-pdfs.component.css'
})
export class DescargaPdfsComponent {
  private sanitizer = inject(DomSanitizer);

  // Base en assets
  readonly base = 'assets/docs/';

  // Catálogos (puedes ampliar sin tocar el código)
  readonly DOCS = signal<PdfDoc[]>([
    { file: 'CATALOGO_EPSON.pdf',                 title: 'Catálogo EPSON',                 brand: 'EPSON',             image: 'assets/img/Logos-webp/Epson.webp' },
    { file: 'CATALOGO_FREESUB.pdf',               title: 'Catálogo Freesub',               brand: 'FREESUB',           image: 'assets/img/Logos-webp/Freesub.webp' },
    { file: 'CATALOGO_IMPRESORAS_DTF-UV.pdf',     title: 'Impresoras DTF / UV',            brand: 'DTF-UV',            image: 'assets/img/Logos-webp/Impresora DTF.avif'  },
    { file: 'CATALOGO_INSUMOS_SUBLIMACION.pdf',   title: 'Insumos de Sublimación',         brand: 'OTROS',             image: 'assets/img/Logos-webp/tazas-blancas-para-sublimar-min.webp'},
    { file: 'CATALOGO_MAQUINAS_GX.pdf',           title: 'Catálogo Máquinas GX',           brand: 'GX',                image: 'assets/img/Logos-webp/Gx Logo.webp'  },
    { file: 'CATALOGO_PUBLICIDAD_VINILES.pdf',    title: 'Publicidad y Viniles',           brand: 'VINILES',           image: 'assets/img/Logos-webp/VINILES-ADHESIVOS.webp' },
    { file: 'CATALOGO_SERIGRAFIA_QUITEXA.pdf',    title: 'Serigrafía Quitexa',             brand: 'SERIGRAFIA',        image: 'assets/img/Logos-webp/logo-quitexa-2.webp' },
    { file: 'CATALOGO_VINILES.pdf',               title: 'Catálogo Viniles',               brand: 'VINILES',           image: 'assets/img/Logos-webp/vinil adesivo.webp' },
    /* { file: 'CATALOGO_DE_MAQUINAS_SERIGRAFIA-OJITO.pdf', title: 'Serigrafía Ojito',        brand: 'SERIGRAFIA',        image: 'assets/Logos-webp/serigrafia.webp' }, */
    { file: 'CATALOGO_AGABE.pdf',                 title: 'Catálogo Agabe',                 brand: 'AGABE',             image: 'assets/img/Logos-webp/Logo Hagabe Negro.webp' },
  ]);

  // Estado UI
  q           = signal('');
  brand       = signal<'TODOS'|PdfDoc['brand']>('TODOS');
  previewDoc  = signal<PdfDoc|null>(null);

  // Helpers
  url(d: PdfDoc) { return this.base + d.file; }
  safeUrl(d: PdfDoc): SafeResourceUrl { return this.sanitizer.bypassSecurityTrustResourceUrl(this.url(d)); }
  titleOf(d: PdfDoc) {
    return d.title ?? d.file
      .replace(/^CATALOGO[_-]?/i,'Catálogo ')
      .replace(/[_-]+/g,' ')
      .replace(/\.pdf$/i,'');
  }

  // Filtros
  readonly BRANDS: Array<'TODOS'|PdfDoc['brand']> = ['TODOS','EPSON','FREESUB','GX','VINILES','SERIGRAFIA','DTF-UV','AGABE','OTROS'];

  filtered = computed(() => {
    const term = this.q().trim().toLowerCase();
    const br   = this.brand();
    return this.DOCS().filter(d => {
      const byBrand = (br === 'TODOS') || d.brand === br;
      const txt = (this.titleOf(d)+' '+d.file+' '+(d.brand ?? '')).toLowerCase();
      const byText = !term || txt.includes(term);
      return byBrand && byText;
    });
  });

  // Acciones
  ver(d: PdfDoc)   { this.previewDoc.set(d); }    // vista embebida
  cerrarPreview()  { this.previewDoc.set(null); }
  
}
