import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type Servicio = {
  id: string;
  titulo: string;
  resumen: string;
  bullets: string[];
  imagen?: string;
  href: string;     // ruta interna para “saber más”
};

@Component({
  selector: 'app-servicios-main',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './servicios-main.component.html',
  styleUrl: './servicios-main.component.css'
})
export class ServiciosMainComponent {
  hero = {
    titulo: 'Servicios que impulsan tu producción',
    subtitulo: 'Instalación, capacitación y soporte para que produzcas desde el día uno.',
    imagen: '/assets/hero/servicios.webp' // opcional
  };

  servicios: Servicio[] = [
    {
      id: 'dtf',
      titulo: 'Impresión DTF',
      resumen: 'Colores intensos y gran resistencia al lavado para múltiples textiles.',
      bullets: ['Tiradas cortas/medianas', 'Aplicable a varias fibras', 'Acabado profesional'],
      imagen: '/assets/servicios/dtf.webp',
      href: '/services/tecnico'
    },
    {
      id: 'quemado',
      titulo: 'Impresión de Quemado',
      resumen: 'Acabado premium para etiquetas y detalles finos en distintos sustratos.',
      bullets: ['Alta definición', 'Gran durabilidad', 'Líneas limpias y precisas'],
      imagen: '/assets/servicios/quemado.webp',
      href: '/services/instalacion'
    },
    {
      id: 'uv',
      titulo: 'Impresión UV',
      resumen: 'Secado instantáneo, barniz selectivo y relieve para rígidos y flexibles.',
      bullets: ['Personalización en rígidos', 'A prueba de rayones', 'Colores vibrantes'],
      imagen: '/assets/servicios/uv.webp',
      href: '/services/capacitacion'
    },
    {
      id: 'revelado',
      titulo: 'Revelado de Mallas',
      resumen: 'Revelado y recuperación de mallas serigráficas listo-para-imprimir.',
      bullets: ['Tensión controlada', 'Emulsión uniforme', 'Entrega rápida'],
      imagen: '/assets/servicios/revelado.webp',
      href: '/services/mantenimiento'
    }
  ];

  trackById = (_: number, s: Servicio) => s.id;

  waLink(): string {
    const phone = '59162537378';
    const text = encodeURIComponent('Hola, me interesa un servicio. ¿Podemos hablar?');
    return `https://wa.me/${phone}?text=${text}`;
  }
}
