import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type Paso = { titulo: string; detalle: string; };
type Item = { titulo: string; detalle: string; };
type Faq = { q: string; a: string; };

@Component({
    selector: 'app-impresion-dtf',
    imports: [CommonModule, RouterLink],
    templateUrl: './impresion-dtf.component.html',
    styleUrl: './impresion-dtf.component.css'
})
export class ImpresionDTFComponent {
   hero = {
    titulo: 'Impresión DTF — Guía rápida',
    subtitulo: 'Del diseño a la prenda: proceso, parámetros y buenas prácticas para resultados profesionales.'
  };

  pasos: Paso[] = [
    { titulo: 'Diseño',
      detalle: 'Crea tu arte a 300 DPI, fondo transparente si corresponde. Evita sombras muy suaves y textos ultra finos.' },
    { titulo: 'Impresión',
      detalle: 'Imprime en film PET. Primero CMYK, luego capa de tinta blanca. Mantén cabezales alineados y purgas al día.' },
    { titulo: 'Aplicación de polvo',
      detalle: 'Espolvorea adhesivo TPU de forma uniforme sobre la tinta fresca. Retira el excedente con sacudidas suaves.' },
    { titulo: 'Curado',
      detalle: 'Precurado en horno/bandeja a 110–130 °C por 2–5 min hasta que el polvo se funda (aspecto brillante/gelificado).' },
    { titulo: 'Transferencia',
      detalle: 'Coloca el film sobre la prenda. Usa papel antiahderente si es necesario para evitar brillos.' },
    { titulo: 'Prensado final',
      detalle: 'Prensa a 150–160 °C, 30 s, presión media–alta. Retira el film (frío o tibio según material) y re-prensa 3–5 s.' }
  ];

  materiales: Item[] = [
    { titulo: 'Impresora compatible DTF',
      detalle: 'Con tintas DTF (CMYK + Blanco) y mantenimiento regular de cabezales.' },
    { titulo: 'Film PET DTF',
      detalle: 'Hoja o rollo. Superficie limpia y libre de humedad.' },
    { titulo: 'Tinta DTF',
      detalle: 'Formula específica para DTF; evita mezclar marcas/lotes distintos sin pruebas previas.' },
    { titulo: 'Polvo adhesivo (TPU)',
      detalle: 'Granulometría acorde a la prenda (fina para textiles delgados, media para algodón/poliéster estándar).' },
    { titulo: 'Horno/charola de curado',
      detalle: 'Control de temperatura estable; alternativa: prensa con separación para precurar.' },
    { titulo: 'Plancha térmica',
      detalle: 'Plato parejo, presión homogénea. Ideal: prensa neumática o de buena palanca.' }
  ];

  parametros: Item[] = [
    { titulo: 'Temperatura de prensado',
      detalle: '150–160 °C (algodón/poliéster). Para tejidos sensibles, baja a 140–145 °C y aumenta el tiempo.' },
    { titulo: 'Tiempo',
      detalle: '12–15 s prensado principal; re-prensado 3–5 s para sellar y mejorar resistencia al lavado.' },
    { titulo: 'Presión',
      detalle: 'Media–alta. Busca huella leve del marco en prensa como referencia de contacto completo.' },
    { titulo: 'Curado del polvo',
      detalle: '110–130 °C por 2–5 min. Señal visual: el polvo se vuelve brillante y homogéneo.' },
    { titulo: 'Pelado de film',
      detalle: 'Según film: frío (espera 20–40 s) o tibio. Prueba con una esquina antes de retirar por completo.' }
  ];

  archivos: Item[] = [
    { titulo: 'Resolución',
      detalle: '300 DPI al tamaño final. Evita escalar en RIP para no suavizar bordes.' },
    { titulo: 'Formato',
      detalle: 'PNG con fondo transparente o TIFF. Evita compresión con pérdida en textos y logos.' },
    { titulo: 'Color',
      detalle: 'sRGB para diseño general. El RIP gestionará CMYK y Blanco; evita overprints innecesarios.' },
    { titulo: 'Trazos y detalles',
      detalle: 'Mínimo 0.3–0.4 pt en líneas. Sangrado 2–3 mm para cortes al ras si corresponde.' },
    { titulo: 'Negros densos',
      detalle: 'Usa negro enriquecido con cuidado. Prefiere  Rich Black controlado por el RIP para no sobrecargar.' }
  ];

  cuidados: Item[] = [
    { titulo: 'Curado total',
      detalle: 'Deja reposar 24 h antes del primer lavado para máxima adhesión.' },
    { titulo: 'Lavado',
      detalle: 'Del revés, agua fría/templada, ciclo suave. Evita cloro y suavizantes fuertes.' },
    { titulo: 'Secado y planchado',
      detalle: 'Secado a la sombra. Planchar del revés o con papel protector; evita contacto directo con el gráfico.' }
  ];

  faqs: Faq[] = [
    { q: 'El transfer se despega en esquinas',
      a: 'Aumenta presión o re-prensa 3–5 s con papel protector. Revisa uniformidad del polvo y curado correcto.' },
    { q: 'Colores apagados',
      a: 'Verifica cabezales/limpieza, saturación en RIP y orden CMYK+Blanco. Mantén films y tintas libres de humedad.' },
    { q: 'Puntos/blancos en zonas sólidas',
      a: 'Filtra polvo, elimina exceso con sacudidas y controla estática. Revisa humedad del ambiente (45–60%).' },
    { q: 'Brillo indeseado en algodón',
      a: 'Usa papel siliconado mate en la re-prensa o reduce temperatura y aumenta tiempo.' },
  ];

  openFaq = -1;
  toggleFaq(i: number) {
    this.openFaq = this.openFaq === i ? -1 : i;
  }

  trackByIndex = (i: number) => i;

  waLink(asunto: string = 'Impresión DTF'): string {
    const phone = '59162537378';
    const text = encodeURIComponent(`Hola, me interesa ${asunto}. ¿Podemos hablar?`);
    return `https://wa.me/${phone}?text=${text}`;
  }
}
