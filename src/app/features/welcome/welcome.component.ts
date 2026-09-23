import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.css'
})
export class WelcomeComponent implements OnInit {
  private seo = inject(SeoService);

  lineNumbers = Array.from({ length: 40 }, (_, i) => i + 1);

  ngOnInit(): void {
    this.seo.update({
      title: 'Juan Esteban Barrios — Software Developer | Java & Spring Boot',
      description: 'Portafolio de Juan Esteban Barrios Portela, desarrollador backend especializado en Java, Spring Boot, Python y Django. Cuatro proyectos en producción con arquitectura hexagonal y APIs REST.',
      path: '/',
      type: 'profile'
    });

    this.seo.setStructuredData({
      '@context': 'https://schema.org',
      '@type': 'Person',
      name: 'Juan Esteban Barrios Portela',
      jobTitle: 'Software Developer',
      description: 'Tecnólogo en Análisis y Desarrollo de Software especializado en Java, Spring Boot, Python y Django.',
      url: this.seo.absolute('/'),
      image: this.seo.absolute('/assets/images/hero/profile.jpg'),
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Bogotá',
        addressCountry: 'CO'
      },
      knowsAbout: ['Java', 'Spring Boot', 'Python', 'Django', 'Angular', 'Arquitectura Hexagonal', 'APIs REST', 'PostgreSQL', 'Docker'],
      sameAs: [
        'https://github.com/1Zamuken1',
        'https://www.linkedin.com/in/juan-barrios-a8a651274/'
      ]
    });
  }
}
