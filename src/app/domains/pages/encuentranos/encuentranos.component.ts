import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { environment } from '../../../../environments/environment';

@Component({
    selector: 'app-encuentranos',
    imports: [CommonModule],
    templateUrl: './encuentranos.component.html',
    styleUrl: './encuentranos.component.css'
})
export class EncuentranosComponent {
  wspLpz = String(environment.WSP_LPZ);
  wspCbba = String(environment.WSP_CBBA);
  wspEaCeibo = String(environment.WSP_EACEIBO);
  wspEaSate = String(environment.WSP_EASATE);
  wspScz = String(environment.WSP_SCZ);

  whatsAppLink(rawNumber: string): string {
    const localNumber = rawNumber.replace(/\D+/g, '');
    return `https://api.whatsapp.com/send?phone=591${localNumber}`;
  }
}
