import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';
import { DataService } from '../../core/services/data.service';
import { Perfil } from '../../shared/models/perfil.model';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css'
})
export class WelcomeComponent implements OnInit {
  private seo = inject(SeoService);
  private dataService = inject(DataService);

  /** Cabecera del perfil, en src/assets/data/perfil.json. */
  protected perfil = signal<Perfil | null>(null);

  lineNumbers = Array.from({ length: 40 }, (_, i) => i + 1);

  ngOnInit(): void {
    // Los metadatos se construyen dentro de la suscripcion para que salgan del
    // mismo sitio que la pagina. Antes el titulo, el puesto y los perfiles
    // estaban escritos aqui, y se quedaron desfasados sin que nada avisara:
    // los datos estructurados no se ven, asi que nadie los revisa.
    this.dataService.getStaticPerfil().subscribe(p => {
      this.perfil.set(p);

      this.seo.update({
        title: `Juan Esteban Barrios — ${p.titular} | ${p.especialidad}`,
        description: 'Portafolio de Juan Esteban Barrios Portela, desarrollador backend especializado en Java, Spring Boot, Python y Django. Cuatro proyectos en producción con arquitectura hexagonal y APIs REST.',
        path: '/',
        type: 'profile'
      });

      this.seo.setStructuredData({
        '@context': 'https://schema.org',
        '@type': 'Person',
        name: 'Juan Esteban Barrios Portela',
        jobTitle: p.titular,
        description: `${p.formacion}, especializado en Java, Spring Boot, Python y Django.`,
        url: this.seo.absolute('/'),
        image: this.seo.absolute('/assets/images/hero/profile.jpg'),
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Bogotá',
          addressCountry: 'CO'
        },
        email: p.correo,
        knowsAbout: ['Java', 'Spring Boot', 'Python', 'Django', 'Angular', 'Arquitectura Hexagonal', 'APIs REST', 'PostgreSQL', 'Docker'],
        sameAs: [p.github, p.linkedin]
      });
    });
  }
}
