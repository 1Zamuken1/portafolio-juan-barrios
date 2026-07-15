import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { Project } from '../../../shared/models/project.model';

@Component({
  selector: 'app-project-modal',
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonModule, TagModule],
  templateUrl: './project-modal.component.html',
  styleUrl: './project-modal.component.css'
})
export class ProjectModalComponent {
  @Input({ required: true }) project!: Project;
  @Output() close = new EventEmitter<void>();

  visible = true;

  onHide(): void {
    this.close.emit();
  }
}
