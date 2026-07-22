import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Project } from '../../../shared/models/project.model';
import { ChipModule } from 'primeng/chip';
import { TagModule } from 'primeng/tag';
import { RippleModule } from 'primeng/ripple';

@Component({
  selector: 'app-project-card',
  standalone: true,
  imports: [CommonModule, ChipModule, TagModule, RippleModule],
  templateUrl: './project-card.component.html',
  styleUrl: './project-card.component.css'
})
export class ProjectCardComponent {
  @Input({ required: true }) project!: Project;
  @Input() index = 0;
  @Output() viewMore = new EventEmitter<void>();

  tiltStyle: Record<string, string> = {};

  private gradientColors: Record<string, string> = {
    'gastu-django': 'linear-gradient(135deg, #2563EB 0%, #22C55E 100%)',
    'sgva-assistant': 'linear-gradient(135deg, #F59E0B 0%, #22C55E 100%)',
    'seona': 'linear-gradient(135deg, #8B5CF6 0%, #2563EB 100%)',
    'salsamentaria': 'linear-gradient(135deg, #EC4899 0%, #F59E0B 100%)'
  };

  get cardGradient(): string {
    return this.gradientColors[this.project.name?.toLowerCase().replace(/\s+/g, '-')] || this.gradientColors['gastu-django'];
  }

  get cardBackground(): string {
    if (this.project.imageUrl) {
      return `url(${this.project.imageUrl}) center/cover no-repeat`;
    }
    return this.cardGradient;
  }

  get animationDelay(): string {
    return `${this.index * 0.1}s`;
  }

  get isLive(): boolean {
    return !!this.project.liveUrl;
  }

  get statusSeverity(): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (this.project.status) {
      case 'Production': return 'success';
      case 'Published': return 'info';
      case 'Active Development': return 'warn';
      default: return 'secondary';
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent): void {
    const el = (event.currentTarget as HTMLElement);
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    this.tiltStyle = {
      transform: `perspective(800px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg) scale3d(1.02, 1.02, 1.02)`
    };
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.tiltStyle = { transform: 'perspective(800px) rotateY(0) rotateX(0) scale3d(1, 1, 1)' };
  }
}
