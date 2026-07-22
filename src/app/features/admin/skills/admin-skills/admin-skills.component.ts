import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { AdminSkill } from '../../../../shared/models/skill.model';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-admin-skills',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, TagModule, ConfirmDialogModule, ToastModule, TooltipModule],
  providers: [ConfirmationService, MessageService],
  templateUrl: './admin-skills.component.html',
  styleUrl: './admin-skills.component.css'
})
export class AdminSkillsComponent implements OnInit {
  skills: AdminSkill[] = [];
  loading = true;

  private dataService = inject(DataService);
  private router = inject(Router);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  ngOnInit(): void {
    this.loadSkills();
  }

  loadSkills(): void {
    this.loading = true;
    this.dataService.refreshAdminSkills();
    this.dataService.getAdminSkills().subscribe({
      next: (skills) => {
        this.skills = skills;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar las habilidades' });
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/admin/dashboard/skills/new']);
  }

  editSkill(skill: AdminSkill): void {
    this.router.navigate(['/admin/dashboard/skills/edit', skill.id]);
  }

  confirmDelete(skill: AdminSkill): void {
    this.confirmationService.confirm({
      message: `¿Seguro que deseas eliminar "${skill.name}"?`,
      header: 'Confirmar Eliminación',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.dataService.deleteSkill(skill.id).subscribe({
          next: () => {
            this.messageService.add({ severity: 'success', summary: 'Eliminado', detail: `${skill.name} ha sido eliminado` });
            this.loadSkills();
          },
          error: () => {
            this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar' });
          }
        });
      }
    });
  }
}
