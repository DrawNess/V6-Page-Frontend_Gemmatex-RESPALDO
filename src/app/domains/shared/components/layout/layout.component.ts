import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '@shared/components/header/header.component';
import { FooterComponent } from '@shared/components/footer/footer.component';

import { PromoBarComponent } from '@shared/components/promo-bar/promo-bar.component';


@Component({
    selector: 'app-layout',
    imports: [CommonModule, HeaderComponent, RouterModule, FooterComponent, PromoBarComponent],
    templateUrl: './layout.component.html',
    styleUrls: ['./layout.component.css']
})
export class LayoutComponent {

}
