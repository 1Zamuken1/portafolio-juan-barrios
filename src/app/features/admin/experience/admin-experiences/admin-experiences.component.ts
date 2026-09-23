import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { Experience } from '../../../../shared/models/experience.model';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-admin-experiences',
  standalone: true,
  imports: [ButtonModule],
  templateUrl: './admin-experiences.component.html',
  styleUrls: ['../../admin.css']
})
export class AdminExperiencesComponent implements OnInit {
  experiences = signal<Experience[]>([]);
  loading = signal(true);

  private dataService = inject(DataService);
  private router = inject(Router);
  private confirmar = inject(ConfirmationService);
  private avisos = inject(MessageService);

  ngOnInit(): void {
    this.loadExperiences();
  }

  loadExperiences(): void {
    this.loading.set(true);
    this.dataService.getExperiences().subscribe({
      next: (experiences) => {
        this.experiences.set(experiences);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.avisos.add({ severity: 'error', summary: 'Error', detail: 'Failed to load experiences' });
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/admin/dashboard/experience/new']);
  }

  editExperience(exp: Experience): void {
    this.router.navigate(['/admin/dashboard/experience/edit', exp.id]);
  }

  async confirmDelete(exp: Experience): Promise<void> {
    const si = await this.preguntar({
      titulo: `¿Eliminar «${exp.company} · ${exp.role}»?`,
      mensaje: 'Se borra de la base de datos. El sitio público no cambia hasta que se publique.',
      confirmar: 'Eliminar',
      peligro: true
    });
    if (!si) return;

    this.dataService.deleteExperience(exp.id).subscribe({
      next: () => {
        this.avisos.add({ severity: 'success', summary: 'Eliminado', detail: `${exp.company} · ${exp.role} se ha eliminado.` });
        this.loadExperiences();
      },
      error: () => {
        this.avisos.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.' });
      }
    });
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
