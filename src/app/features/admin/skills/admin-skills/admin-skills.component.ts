import { Component, inject, OnInit, signal } from '@angular/core';
import { Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { AdminSkill } from '../../../../shared/models/skill.model';

import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-admin-skills',
  standalone: true,
  imports: [ButtonModule, TagModule],
  templateUrl: './admin-skills.component.html',
  styleUrls: ['../../admin.css', './admin-skills.component.css']
})
export class AdminSkillsComponent implements OnInit {
  skills = signal<AdminSkill[]>([]);
  loading = signal(true);

  private dataService = inject(DataService);
  private router = inject(Router);
  private confirmar = inject(ConfirmationService);
  private avisos = inject(MessageService);

  ngOnInit(): void {
    this.loadSkills();
  }

  loadSkills(): void {
    this.loading.set(true);
    this.dataService.getAdminSkills().subscribe({
      next: (skills) => {
        this.skills.set(skills);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.avisos.add({ severity: 'error', summary: 'Error', detail: 'Failed to load skills' });
      }
    });
  }

  createNew(): void {
    this.router.navigate(['/admin/dashboard/skills/new']);
  }

  editSkill(skill: AdminSkill): void {
    this.router.navigate(['/admin/dashboard/skills/edit', skill.id]);
  }

  async confirmDelete(skill: AdminSkill): Promise<void> {
    const si = await this.preguntar({
      titulo: `¿Eliminar «${skill.name}»?`,
      mensaje: 'Se borra de la base de datos. El sitio público no cambia hasta que se publique.',
      confirmar: 'Eliminar',
      peligro: true
    });
    if (!si) return;

    this.dataService.deleteSkill(skill.id).subscribe({
      next: () => {
        this.avisos.add({ severity: 'success', summary: 'Eliminado', detail: `${skill.name} se ha eliminado.` });
        this.loadSkills();
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
