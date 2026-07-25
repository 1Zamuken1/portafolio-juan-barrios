import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-knowledge-pillars',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './knowledge-pillars.component.html',
  styleUrl: './knowledge-pillars.component.css',
})
export class KnowledgePillarsComponent {
  architectureFloors = [
    { items: ['Arquitectura Hexagonal'] },
    { items: ['MVC', 'REST APIs'] },
    { items: ['Inyección de Dependencias', 'JPA / Hibernate'] },
    { items: ['JWT', 'SOLID', 'Clean Code'] },
  ];

  learningSteps = [
    { name: 'Docker', icon: 'fab fa-docker' },
    { name: 'CI/CD', icon: 'fas fa-infinity' },
    { name: 'AWS', icon: 'fab fa-aws' },
    { name: 'Spring Cloud', icon: 'fas fa-cloud' },
    { name: 'Kubernetes', icon: 'fas fa-dharmachakra' },
  ];
}
