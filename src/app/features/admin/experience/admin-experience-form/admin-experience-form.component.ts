import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { Experience } from '../../../../shared/models/experience.model';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-admin-experience-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    ToastModule,
    InputNumberModule
  ],
  providers: [MessageService],
  templateUrl: './admin-experience-form.component.html',
  styleUrl: './admin-experience-form.component.css'
})
export class AdminExperienceFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  experienceId: number | null = null;
  loading = false;
  saving = false;

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
      this.experienceId = +id;
      this.loadExperience(this.experienceId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      company: ['', Validators.required],
      role: ['', Validators.required],
      period: ['', Validators.required],
      description: [''],
      achievementsStr: [''],
      displayOrder: [0]
    });
  }

  private loadExperience(id: number): void {
    this.loading = true;
    this.dataService.getExperiences().subscribe({
      next: (experiences) => {
        const exp = experiences.find(e => e.id === id);
        if (exp) {
          this.form.patchValue({
            ...exp,
            achievementsStr: exp.achievements?.join(', ') || ''
          });
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cargar la experiencia' });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const formValue = this.form.value;

    const expData: Experience = {
      ...formValue,
      achievements: formValue.achievementsStr
        ? formValue.achievementsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s)
        : [],
    };

    delete (expData as any).achievementsStr;

    const operation = this.isEditMode
      ? this.dataService.updateExperience(this.experienceId!, expData)
      : this.dataService.createExperience(expData);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail: this.isEditMode ? 'Experiencia actualizada' : 'Experiencia creada'
        });
        setTimeout(() => this.router.navigate(['/admin/dashboard/experience']), 1000);
      },
      error: () => {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la experiencia' });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/dashboard/experience']);
  }
}
