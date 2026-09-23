import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../../core/services/data.service';
import { SeoService } from '../../../core/services/seo.service';
import { Experience } from '../../../shared/models/experience.model';
import { DocumentoBase } from '../documento-base';

/**
 * La trayectoria: experiencia y formacion en una sola linea de tiempo.
 *
 * Antes esto era una seccion dentro del documento de perfil con una unica
 * entrada, y se leia como un segundo "sobre mi" en vez de como un recorrido.
 * Con tres entradas fechadas ya es lo que dice ser.
 *
 * La formacion va aqui y no en un bloque aparte a proposito: en un perfil
 * junior el titulo es una credencial de primer orden, y separarla en su propia
 * seccion la deja como una nota al pie de dos lineas.
 */
@Component({
  selector: 'app-trayectoria',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './trayectoria.component.html',
  styleUrls: ['../documento.css']
})
export class TrayectoriaComponent extends DocumentoBase implements OnInit {
  private dataService = inject(DataService);
  private seo = inject(SeoService);

  entradas = signal<Experience[]>([]);

  ngOnInit(): void {
    this.seo.update({
      title: 'Trayectoria',
      description: 'Experiencia y formacion de Juan Esteban Barrios: Software Developer en SEK, desarrollo independiente y Tecnologo en Analisis y Desarrollo de Software del SENA.',
      path: '/about/trayectoria',
      type: 'profile'
    });

    this.dataService.getStaticExperiences().subscribe(datos => {
      this.entradas.set([...datos].sort((a, b) => a.displayOrder - b.displayOrder));
    });
  }

  /** El icono distingue trabajo de formacion sin necesidad de un campo nuevo. */
  icono(entrada: Experience): string {
    if (entrada.icon === 'graduation-cap') return 'pi pi-graduation-cap';
    if (entrada.icon === 'code') return 'pi pi-code';
    return 'pi pi-briefcase';
  }
}
