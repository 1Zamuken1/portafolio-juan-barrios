import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService } from '../../core/services/data.service';
import { Project } from '../../shared/models/project.model';
import { ProjectCardComponent } from './project-card/project-card.component';
import { ProjectModalComponent } from './project-modal/project-modal.component';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

@Component({
  selector: 'app-projects',
  standalone: true,
  imports: [CommonModule, ProjectCardComponent, ProjectModalComponent],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.css'
})
export class ProjectsComponent implements OnInit {
  private dataService = inject(DataService);

  projects = signal<Project[]>([]);
  selectedProject = signal<Project | null>(null);

  ngOnInit(): void {
    this.dataService.getProjects().subscribe({
      next: (data) => {
        // Show only active/production projects on the home page, or all if you prefer
        // For now, let's just show all of them and filter out drafts if needed
        const visibleProjects = data.filter(p => p.status !== 'Draft');
        this.projects.set(visibleProjects);
        
        // Initialize ScrollTrigger for cards after render
        setTimeout(() => {
          gsap.registerPlugin(ScrollTrigger);
          gsap.fromTo('.stitch-project-card', 
            { y: 80, opacity: 0 },
            { 
              y: 0, opacity: 1, duration: 0.8, stagger: 0.15, ease: 'power3.out',
              scrollTrigger: { 
                trigger: '.projects-grid', 
                start: 'top 85%',
                toggleActions: 'play none none none'
              }
            }
          );
        }, 100);
      },
      error: (err) => {
        console.error('Error loading projects:', err);
      }
    });
  }

  openModal(project: Project): void {
    this.selectedProject.set(project);
  }

  closeModal(): void {
    this.selectedProject.set(null);
  }
}
