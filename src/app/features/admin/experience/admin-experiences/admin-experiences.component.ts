import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { Experience } from '../../../../shared/models/experience.model';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-admin-experiences',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ConfirmDialogModule, ToastModule, TooltipModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './admin-experiences.component.html',
  styleUrl: './admin-experiences.component.css'
})
export class AdminExperiencesComponent implements OnInit {
  experiences: Experience[] = [];
  loading = true;

  private dataService = inject(DataService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  ngOnInit(): void {
    this.loadExperiences();
  }

  loadExperiences(): void {
    this.loading = true;
    this.dataService.refreshExperiences();
    this.dataService.getExperiences().subscribe({
      next: (experiences) => {
        this.experiences = experiences;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las experiencias' });
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/admin/dashboard/experience/new']);
  }

  editExperience(exp: Experience): void {
    this.router.navigate(['/admin/dashboard/experience/edit', exp.id]);
  }

  confirmDelete(exp: Experience): void {
    this.confirmationService.confirm({
      message: `¿Seguro que deseas eliminar "${exp.company} - ${exp.role}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.dataService.deleteExperience(exp.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: `${exp.company} ha sido eliminado` });
            this.loadExperiences();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
          }
        });
      }
    });
  }
}
