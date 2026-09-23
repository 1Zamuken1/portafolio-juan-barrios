import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { Project } from '../../../../shared/models/project.model';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-admin-projects',
  standalone: true,
  imports: [ButtonModule, TagModule],
  templateUrl: './admin-projects.component.html',
  styleUrls: ['../../admin.css', './admin-projects.component.css']
})
export class AdminProjectsComponent implements OnInit {
  projects = signal<Project[]>([]);
  loading = signal(true);

  private dataService = inject(DataService);
  private router = inject(Router);
  private confirmar = inject(ConfirmationService);
  private avisos = inject(MessageService);

  ngOnInit(): void {
    this.loadProjects();
  }

  loadProjects(): void {
    this.loading.set(true);
    this.dataService.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.avisos.add({ severity: 'error', summary: 'Error', detail: 'No se pudieron cargar los proyectos.' });
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/admin/dashboard/projects/new']);
  }

  editProject(project: Project): void {
    this.router.navigate(['/admin/dashboard/projects/edit', project.id]);
  }

  async confirmDelete(project: Project): Promise<void> {
    const si = await this.preguntar({
      titulo: `¿Eliminar «${project.name}»?`,
      mensaje: 'Se borra de la base de datos. El sitio público no cambia hasta que se publique, y el JSON del repositorio sigue teniéndolo.',
      confirmar: 'Eliminar',
      peligro: true
    });
    if (!si) return;

    this.dataService.deleteProject(project.id).subscribe({
      next: () => {
        this.avisos.add({ severity: 'success', summary: 'Eliminado', detail: `${project.name} se ha eliminado.` });
        this.loadProjects();
      },
      error: () => {
        this.avisos.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar el proyecto.' });
      }
    });
  }

  tonoEstado(status: string): 'success' | 'info' | 'warn' | 'secondary' {
    switch (status) {
      case 'Production': return 'success';
      case 'Published': return 'info';
      case 'Active Development': return 'warn';
      default: return 'secondary';
    }
  }

  /**
   * La confirmacion de PrimeNG, como promesa: se lee "si confirma, borra" de
   * arriba abajo en vez de con la accion metida dentro de la pregunta. El foco
   * va a Cancelar, para que un Enter por inercia no borre nada.
   */
  private preguntar(p: { titulo: string; mensaje: string; confirmar: string; peligro?: boolean }): Promise<boolean> {
    return new Promise((resolver) => this.confirmar.confirm({
      header: p.titulo,
      message: p.mensaje,
      icon: p.peligro ? 'pi pi-trash' : 'pi pi-question-circle',
      defaultFocus: 'reject',
      closeOnEscape: true,
      dismissableMask: true,
      acceptButtonProps: { label: p.confirmar, severity: p.peligro ? 'danger' : 'primary' },
      rejectButtonProps: { label: 'Cancelar', text: true, severity: 'secondary' },
      accept: () => resolver(true),
      reject: () => resolver(false)
    }));
  }
}
