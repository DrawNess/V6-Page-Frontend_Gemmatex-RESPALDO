import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild
} from '@angular/core';
import { CommonModule } from '@angular/common';

interface Hito {
  anio: string;
  titulo: string;
  detalle: string;
}

@Component({
  selector: 'app-sobre-nosotros',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sobre-nosotros.component.html',
  styleUrl: './sobre-nosotros.component.css'
})
export class SobreNosotrosComponent implements AfterViewInit, OnDestroy {
  readonly hitos: Hito[] = [
    {
      anio: '1994',
      titulo: 'Inicio de operaciones en La Paz',
      detalle:
        'Comienzo de actividades en el rubro de comercialización de productos de consumo masivo, consolidando una base comercial y operativa que permitió un crecimiento sostenido.'
    },
    {
      anio: '2006',
      titulo: 'Ingreso al sector textil',
      detalle:
        'La empresa orienta su actividad hacia la importación y comercialización de productos textiles, ampliando su portafolio y fortaleciendo su posicionamiento en el mercado.'
    },
    {
      anio: '2009',
      titulo: 'Maquinaria e insumos textiles',
      detalle:
        'Redefinición estratégica e ingreso al negocio de maquinaria e insumos para la industria textil, marcando el inicio de la especialización.'
    },
    {
      anio: '2011',
      titulo: 'Embellecimiento textil y sublimación',
      detalle:
        'Incursión en el embellecimiento textil, particularmente en sublimación, consolidándonos como aliado estratégico para emprendedores y empresas en crecimiento.'
    },
    {
      anio: '2019',
      titulo: 'Nacimiento de TEXBOL S.R.L.',
      detalle:
        'En abril se ejecuta una reestructuración empresarial dando inicio a TEXBOL S.R.L. como nueva estructura corporativa, orientada a fortalecer la gestión y consolidar el modelo de negocio.'
    },
    {
      anio: '2020',
      titulo: 'Impresión digital',
      detalle:
        'Incorporación de tecnologías de impresión digital, consolidando el posicionamiento de la empresa en el mercado.'
    },
    {
      anio: '2023',
      titulo: 'Canal oficial Epson Bolivia',
      detalle:
        'GEMMATEX se convierte en canal oficial de distribución de la línea industrial de sublimación de Epson en Bolivia.'
    },
    {
      anio: 'Hoy',
      titulo: 'Referente nacional',
      detalle:
        'Empresa referente a nivel nacional, orientada a la innovación, la calidad y la mejora continua, brindando soluciones integrales que impulsan negocios rentables.'
    }
  ];

  @ViewChild('viewport', { static: false }) viewportRef?: ElementRef<HTMLDivElement>;
  @ViewChild('track', { static: false }) trackRef?: ElementRef<HTMLDivElement>;

  private rafId = 0;
  private readonly speedPxPerSec = 30;
  private lastTs = 0;
  private isDragging = false;
  private isHovering = false;
  private direction: 1 | -1 = 1;
  private dragStartX = 0;
  private dragStartScroll = 0;
  private dragMoved = false;
  private pointerId: number | null = null;

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    queueMicrotask(() => this.startAuto());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.rafId);
  }

  private maxScroll(): number {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return 0;
    return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  }

  private startAuto(): void {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;
    viewport.scrollLeft = 0;

    this.zone.runOutsideAngular(() => {
      const tick = (ts: number) => {
        if (!this.lastTs) this.lastTs = ts;
        const dt = (ts - this.lastTs) / 1000;
        this.lastTs = ts;

        if (!this.isDragging && !this.isHovering) {
          const max = this.maxScroll();
          if (max <= 0) {
            this.rafId = requestAnimationFrame(tick);
            return;
          }
          const next = viewport.scrollLeft + this.direction * this.speedPxPerSec * dt;
          if (next >= max) {
            viewport.scrollLeft = max;
            this.direction = -1;
          } else if (next <= 0) {
            viewport.scrollLeft = 0;
            this.direction = 1;
          } else {
            viewport.scrollLeft = next;
          }
        }
        this.rafId = requestAnimationFrame(tick);
      };
      this.rafId = requestAnimationFrame(tick);
    });
  }

  onPointerEnter(): void {
    this.isHovering = true;
  }

  onPointerLeave(): void {
    this.isHovering = false;
    this.endDrag();
  }

  onPointerDown(ev: PointerEvent): void {
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;
    this.isDragging = true;
    this.dragMoved = false;
    this.dragStartX = ev.clientX;
    this.dragStartScroll = viewport.scrollLeft;
    this.pointerId = ev.pointerId;
    viewport.setPointerCapture(ev.pointerId);
    ev.preventDefault();
  }

  onPointerMove(ev: PointerEvent): void {
    if (!this.isDragging) return;
    const viewport = this.viewportRef?.nativeElement;
    if (!viewport) return;
    const dx = ev.clientX - this.dragStartX;
    if (Math.abs(dx) > 3) this.dragMoved = true;
    const max = this.maxScroll();
    const next = this.dragStartScroll - dx;
    viewport.scrollLeft = Math.max(0, Math.min(max, next));
  }

  onPointerUp(): void {
    this.endDrag();
  }

  private endDrag(): void {
    const viewport = this.viewportRef?.nativeElement;
    if (this.pointerId !== null && viewport?.hasPointerCapture(this.pointerId)) {
      viewport.releasePointerCapture(this.pointerId);
    }
    this.pointerId = null;
    this.isDragging = false;
  }
}
