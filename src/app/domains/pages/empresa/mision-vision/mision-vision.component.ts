import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-mision-vision',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './mision-vision.component.html',
  styleUrl: './mision-vision.component.css'
})
export class MisionVisionComponent {
  readonly principiosMision: string[] = [
    'Desarrollo de negocios rentables',
    'Soluciones tecnológicas integrales',
    'Acompañamiento especializado al cliente',
    'Calidad y satisfacción del cliente',
    'Gestión eficiente y orientada a procesos'
  ];

  readonly principiosVision: string[] = [
    'Enfoque en el cliente',
    'Soluciones tecnológicas innovadoras',
    'Desarrollo de negocios rentables',
    'Excelencia operativa y gestión por procesos',
    'Innovación y mejora continua',
    'Liderazgo y posicionamiento en el mercado'
  ];
}
