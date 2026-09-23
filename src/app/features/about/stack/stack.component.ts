import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { DataService } from '../../../core/services/data.service';
import { SeoService } from '../../../core/services/seo.service';
import { AdminSkill } from '../../../shared/models/skill.model';
import { DocumentoBase } from '../documento-base';

/**
 * El stack, agrupado por categoria.
 *
 * Las categorias vienen del propio dato y no de una lista escrita aqui: si
 * manana se anade una, aparece sola. Antes eran cuatro y mezclaban cosas
 * --PostgreSQL contaba como backend y SQL como DevOps-- asi que las bases de
 * datos no se veian por ninguna parte pese a estar.
 */
@Component({
  selector: 'app-stack',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './stack.component.html',
  styleUrls: ['../documento.css']
})
export class StackComponent extends DocumentoBase implements OnInit {
  private dataService = inject(DataService);
  private seo = inject(SeoService);

  porCategoria = signal<{ categoria: string; skills: AdminSkill[] }[]>([]);

  ngOnInit(): void {
    this.seo.update({
      title: 'Stack tecnologico',
      description: 'Tecnologias y herramientas de Juan Esteban Barrios: Java, Spring Boot, Python, Django, Angular, PostgreSQL, Docker y arquitectura hexagonal.',
      path: '/about/stack',
      type: 'profile'
    });

    this.dataService.getStaticSkillsFlat().subscribe(datos => {
      const orden = [...datos].sort((a, b) => a.displayOrder - b.displayOrder);
      const grupos = new Map<string, AdminSkill[]>();

      for (const skill of orden) {
        const categoria = skill.category || 'General';
        const lista = grupos.get(categoria);
        if (lista) lista.push(skill);
        else grupos.set(categoria, [skill]);
      }

      this.porCategoria.set(
        [...grupos].map(([categoria, skills]) => ({ categoria, skills })));
    });
  }

  /** Un ancla estable por categoria, para poder enlazar a una en concreto. */
  ancla(categoria: string): string {
    return categoria.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
