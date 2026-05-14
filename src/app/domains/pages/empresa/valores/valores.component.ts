import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Valor {
  numero: string;
  nombre: string;
  descripcion: string;
}

@Component({
  selector: 'app-valores',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './valores.component.html',
  styleUrl: './valores.component.css'
})
export class ValoresComponent {
  readonly valores: Valor[] = [
    {
      numero: '01',
      nombre: 'Enfoque en el cliente',
      descripcion: 'Cada solución parte de entender al cliente y de generar resultados que impulsen su negocio.'
    },
    {
      numero: '02',
      nombre: 'Integridad',
      descripcion: 'Actuamos con honestidad, transparencia y coherencia en todas nuestras relaciones.'
    },
    {
      numero: '03',
      nombre: 'Responsabilidad',
      descripcion: 'Asumimos cada compromiso con seriedad y respondemos por las consecuencias de nuestras decisiones.'
    },
    {
      numero: '04',
      nombre: 'Compromiso',
      descripcion: 'Damos lo mejor de nosotros en cada proyecto para alcanzar los objetivos planteados.'
    },
    {
      numero: '05',
      nombre: 'Lealtad',
      descripcion: 'Cultivamos vínculos duraderos con clientes, colaboradores y aliados estratégicos.'
    },
    {
      numero: '06',
      nombre: 'Colaboración',
      descripcion: 'Creemos en el trabajo en equipo y en sumar capacidades para lograr resultados superiores.'
    },
    {
      numero: '07',
      nombre: 'Innovación',
      descripcion: 'Exploramos nuevas tecnologías y soluciones para mantenernos a la vanguardia del sector.'
    },
    {
      numero: '08',
      nombre: 'Respeto',
      descripcion: 'Valoramos las ideas, opiniones y diferencias de quienes forman parte de nuestro entorno.'
    }
  ];
}
