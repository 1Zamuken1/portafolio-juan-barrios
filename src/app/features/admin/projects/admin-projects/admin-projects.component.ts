import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { Project } from '../../../../shared/models/project.model';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule, ConfirmDialogModule, ToastModule, TooltipModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './admin-projects.component.html',
  styleUrl: './admin-projects.component.css'
})
export class AdminProjectsComponent implements OnInit {
  projects: Project[] = [];
  loading = true;

  private dataService = inject(DataService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading = true;
    this.dataService.refreshProjects();
    this.dataService.getProjects().subscribe({
      next: (projects) => {
        this.projects = projects;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load projects' });
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/admin/dashboard/projects/new']);
  }

  editProject(project: Project): void {
    this.router.navigate(['/admin/dashboard/projects/edit', project.id]);
  }

  confirmDelete(project: Project): void {
    this.confirmationService.confirm({
      message: `Are you sure you want to delete "${project.name}"?`,
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.dataService.deleteProject(project.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Deleted', detail: `${project.name} has been deleted` });
            this.loadProjects();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to delete project' });
          }
        });
      }
    });
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    switch (status) {
      case 'Production': return 'success';
      case 'Published': return 'info';
      case 'Active Development': return 'warn';
      default: return 'secondary';
    }
  }
}
