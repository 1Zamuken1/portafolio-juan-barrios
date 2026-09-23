import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { AdminSkill } from '../../../../shared/models/skill.model';

import { MessageService } from 'primeng/api';
import { PRIMENG_FORMULARIO } from '../../primeng';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
  selector: 'app-admin-skill-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ...PRIMENG_FORMULARIO, InputGroupModule, InputGroupAddonModule],
  templateUrl: './admin-skill-form.component.html',
  styleUrls: ['../../admin.css']
})
export class AdminSkillFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  skillId: number | null = null;
  loading = signal(false);
  saving = signal(false);

  /** Los tres colores van igual: campo y muestra al lado. */
  protected readonly colores = [
    { control: 'color', etiqueta: 'Color de marca', ejemplo: '#DD0031', obligatorio: true },
    { control: 'brandColorLight', etiqueta: 'Variante clara', ejemplo: '#FF4081', obligatorio: false },
    { control: 'brandColorDark', etiqueta: 'Variante oscura', ejemplo: '#AA0000', obligatorio: false }
  ];

  categoryOptions = [
    { label: 'Frontend', value: 'Frontend' },
    { label: 'Backend', value: 'Backend' },
    { label: 'Database', value: 'Database' },
    { label: 'Tools', value: 'Tools' },
    { label: 'DevOps', value: 'DevOps' }
  ];

  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  ngOnInit(): void {
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.skillId = +id;
      this.loadSkill(this.skillId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      category: ['Backend', Validators.required],
      icon: ['pi pi-star', Validators.required],
      color: ['#ffffff', Validators.required],
      brandColorLight: [''],
      brandColorDark: [''],
      description: [''],
      displayOrder: [0]
    });
  }

  private loadSkill(id: number): void {
    this.loading.set(true);
    this.dataService.getAdminSkills().subscribe({
      next: (skills) => {
        const skill = skills.find(s => s.id === id);
        if (skill) {
          this.form.patchValue(skill);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la habilidad' });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const skillData: AdminSkill = this.form.value;

    const operation = this.isEditMode
      ? this.dataService.updateSkill(this.skillId!, skillData)
      : this.dataService.createSkill(skillData);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.isEditMode ? 'Habilidad actualizada' : 'Habilidad creada'
        });
        setTimeout(() => this.router.navigate(['/admin/dashboard/skills']), 1000);
      },
      error: () => {
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la habilidad' });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/dashboard/skills']);
  }
}
