import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { SeoService } from '../../core/services/seo.service';
import { Project } from '../../shared/models/project.model';
import { DocumentoBase } from './documento-base';

/**
 * El perfil: quien soy, en que ando y como contactarme.
 *
 * Antes este documento lo contenia todo --perfil, experiencia, stack y las
 * fichas completas de los cuatro proyectos-- mientras el explorador ofrecia
 * tres "ficheros" que en realidad eran anclas del mismo texto. Pulsar
 * timeline.json no abria nada, solo desplazaba.
 *
 * Ahora la trayectoria y el stack son documentos propios, y aqui queda el
 * perfil mas un indice corto hacia ellos y hacia las fichas de proyecto. El
 * indice importa: quien llega por un enlace directo no ha visto el explorador,
 * y sin el pensaria que esto es todo lo que hay.
 */
@Component({
  selector: 'app-about',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './about.component.html',
  styleUrls: ['./documento.css']
})
export class AboutComponent extends DocumentoBase implements OnInit {
  private dataService = inject(DataService);
  private seo = inject(SeoService);

  projects = signal<Project[]>([]);

  ngOnInit(): void {
    this.seo.update({
      title: 'Sobre mí',
      description: 'Juan Esteban Barrios, Software Developer orientado a Java y Spring Boot. Desarrollo de APIs REST, aplicaciones web con Angular y Django, y software en un entorno de ciberseguridad y MDR.',
      path: '/about',
      type: 'profile'
    });

    this.dataService.getStaticProjects().subscribe(datos => {
      this.projects.set(datos.filter(p => p.status !== 'Draft'));
    });
  }
}
