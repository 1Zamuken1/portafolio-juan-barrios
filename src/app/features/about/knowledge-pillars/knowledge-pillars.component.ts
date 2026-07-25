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
  architectureFloors: { items: string[] }[] = [];

  learningSteps = [];
}
