import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

type Video = {
  id: string;          // 👈 YouTube ID (reemplaza por los tuyos)
  titulo: string;
  canal?: string;
  link?: string;
  insertion?: string;
};

@Component({
    selector: 'app-perfiles-de-color',
    imports: [CommonModule, RouterLink],
    templateUrl: './perfiles-de-color.component.html',
    styleUrl: './perfiles-de-color.component.css'
})
export class PerfilesDeColorComponent {


  hero = {
    titulo: 'Recursos y Material de Apoyo',
    subtitulo: 'Videos prácticos y perfiles de color para optimizar tu producción.'
  };

  // 👇 Reemplaza los IDs por los tuyos
  videos: Video[] = [
    { id: 'XXXXXXXXXXX', titulo: 'Plotter de corte JINKA 721 paso a paso.', canal: 'GEMMATEX', link: 'https://www.youtube.com/watch?v=PZ9-Om6A3Ow', insertion: 'https://www.youtube.com/embed/PZ9-Om6A3Ow' },
    { id: 'YYYYYYYYYYY', titulo: 'Cuatricromía con serigrafía', canal: 'GEMMATEX', link: 'https://youtu.be/wIehFz_XlSM', insertion: "https://www.youtube.com/embed/wIehFz_XlSM" },
    { id: 'ZZZZZZZZZZZ', titulo: 'Serigrafía en 3D', canal: 'GEMMATEX', link: 'https://youtu.be/sv3RaWa5Wb0', insertion: 'https://www.youtube.com/embed/sv3RaWa5Wb0' },
    /* { id: 'AAAAAAAAAAA', titulo: 'Perfiles de color: ¿cuál usar?', canal: 'GEMMATEX', duracion: '5:47' },
    { id: 'BBBBBBBBBBB', titulo: 'Mantenimiento básico de cabezales', canal: 'GEMMATEX', duracion: '7:32' },
    { id: 'CCCCCCCCCCC', titulo: 'Vinil textil: corte y planchado', canal: 'GEMMATEX', duracion: '4:56' }, */
  ];

  /* trackById = (_: number, v: Video) => v.id; */
  trackById(index: number, item: { id: string | number } | any) {
    return item.id ?? index;  // o lo que uses como identificador
  }

  thumbUrl(id: string) {
    return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }
  watchUrl(id: string) {
    return `https://www.youtube.com/watch?v=${id}`;
  }
}
