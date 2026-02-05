import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Location {
  name: string;
  address: string;
  mapUrl: string;
}

interface ContactPhone {
  city: string;
  number: string;
  link: string;
}

interface SocialLink {
  name: string;
  url: string;
  icon: string;
  ariaLabel: string;
}
@Component({
    selector: 'app-footer',
    imports: [CommonModule],
    templateUrl: './footer.component.html',
    styleUrl: './footer.component.css'
})
export class FooterComponent {
  logoUrl = 'https://peru-crane-813567.hostingersite.com/Logos/Nuevo%20Logo%20Completo%20Blanco.png';
  locationIcon = 'https://peru-crane-813567.hostingersite.com/Logos/Iconos/ubicacion-blanco.webp';
  epsonLogo = 'https://peru-crane-813567.hostingersite.com/Logos/Marcas/logo%20Epson.png';

  locations: Location[] = [
    {
      name: 'Casa Matriz LA PAZ',
      address: 'Av. Illampu esq. Graneros N.º 682',
      mapUrl: 'https://goo.gl/maps/do7Hp1SowhjupSrX6'
    },
    {
      name: 'Cochabamba',
      address: 'Av. Aroma entre 16 de julio y Oquendo',
      mapUrl: 'https://maps.app.goo.gl/YjqQhsZbnFX9Ra3L6'
    },
    {
      name: 'El Alto CEIBO',
      address: 'Zona 16 de julio, Calle René Dorado N°200',
      mapUrl: 'https://goo.gl/maps/EyVSdMvaQMJREoWF6'
    },
    {
      name: 'El Alto Satélite',
      address: 'Av. Panorámica frente al canal RTP',
      mapUrl: 'https://maps.app.goo.gl/FCK113zY5iUNCrtn9'
    },
    {
      name: 'Santa Cruz',
      address: 'Calle Isabela Católica Nº275',
      mapUrl: '#'
    }
  ];

  email = 'info@gemmatex.com.bo';

  phones: ContactPhone[] = [
    { city: 'LPZ', number: '+591 71926087', link: 'tel:+59171926087' },
    { city: 'CBBA', number: '+591 62537431', link: 'tel:+59162537431' },
    { city: 'SCRZ', number: '+591 63565431', link: 'tel:+59163565431' }
  ];

  socialLinks: SocialLink[] = [
    {
      name: 'Facebook',
      url: 'https://www.facebook.com/profile.php?id=100076372653530',
      icon: 'https://peru-crane-813567.hostingersite.com/Logos/Iconos/Facebook%20blanco.png',
      ariaLabel: 'Visitar Facebook de Gemmatex'
    },
    {
      name: 'TikTok',
      url: 'https://www.tiktok.com/@gemmatextv',
      icon: 'https://peru-crane-813567.hostingersite.com/Logos/Iconos/tiktok%20blanco.png',
      ariaLabel: 'Visitar TikTok de Gemmatex'
    },
    {
      name: 'YouTube',
      url: 'https://www.youtube.com/@GemmatexTV',
      icon: 'https://peru-crane-813567.hostingersite.com/Logos/Iconos/Youtube%20blanco.png',
      ariaLabel: 'Visitar YouTube de Gemmatex'
    },
    {
      name: 'Messenger',
      url: 'https://www.facebook.com/profile.php?id=100076372653530',
      icon: 'https://peru-crane-813567.hostingersite.com/Logos/Iconos/messager%20blanco.png',
      ariaLabel: 'Contactar por Messenger'
    }
  ];

  currentYear = new Date().getFullYear();
}
