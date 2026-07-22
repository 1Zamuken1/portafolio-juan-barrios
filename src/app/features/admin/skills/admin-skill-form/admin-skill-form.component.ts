import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { AdminSkill } from '../../../../shared/models/skill.model';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-admin-skill-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    ButtonModule,
    SelectModule,
    ToastModule,
    InputNumberModule
  ],
  providers: [MessageService],
  templateUrl: './admin-skill-form.component.html',
  styleUrl: './admin-skill-form.component.css'
})
export class AdminSkillFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  skillId: number | null = null;
  loading = false;
  saving = false;

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
      displayOrder: [0]
    });
  }

  private loadSkill(id: number): void {
    this.loading = true;
    this.dataService.getAdminSkills().subscribe({
      next: (skills) => {
        const skill = skills.find(s => s.id === id);
        if (skill) {
          this.form.patchValue(skill);
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la habilidad' });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving = true;
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
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la habilidad' });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/dashboard/skills']);
  }
}
