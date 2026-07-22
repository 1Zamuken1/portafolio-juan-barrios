import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { Project } from '../../../../shared/models/project.model';

// PrimeNG
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { InputNumberModule } from 'primeng/inputnumber';

@Component({
  selector: 'app-admin-project-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    SelectModule,
    ToastModule,
    InputNumberModule
  ],
  providers: [MessageService],
  templateUrl: './admin-project-form.component.html',
  styleUrl: './admin-project-form.component.css'
})
export class AdminProjectFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  projectId: number | null = null;
  loading = false;
  saving = false;

  statusOptions = [
    { label: 'Draft', value: 'Draft' },
    { label: 'Active Development', value: 'Active Development' },
    { label: 'Completed', value: 'Completed' },
    { label: 'Production', value: 'Production' },
    { label: 'Published', value: 'Published' }
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
      this.projectId = +id;
      this.loadProject(this.projectId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', Validators.required],
      shortDescription: ['', Validators.required],
      fullDescription: [''],
      role: [''],
      year: [new Date().getFullYear(), Validators.required],
      status: ['Draft', Validators.required],
      technologiesStr: [''],
      featuresStr: [''],
      highlightsStr: [''],
      githubUrl: [''],
      liveUrl: [''],
      imageUrl: [''],
      displayOrder: [0]
    });
  }

  private loadProject(id: number): void {
    this.loading = true;
    this.dataService.getProjects().subscribe({
      next: (projects) => {
        const project = projects.find(p => p.id === id);
        if (project) {
          this.form.patchValue({
            ...project,
            technologiesStr: project.technologies?.join(', ') || '',
            featuresStr: project.features?.join(', ') || '',
            highlightsStr: project.highlights?.join(', ') || ''
          });
        }
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load project' });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving = true;
    const formValue = this.form.value;
    
    const projectData: Project = {
      ...formValue,
      technologies: formValue.technologiesStr ? formValue.technologiesStr.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
      features: formValue.featuresStr ? formValue.featuresStr.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
      highlights: formValue.highlightsStr ? formValue.highlightsStr.split(',').map((s: string) => s.trim()).filter((s: string) => s) : [],
    };
    
    // Cleanup temporary string fields
    delete (projectData as any).technologiesStr;
    delete (projectData as any).featuresStr;
    delete (projectData as any).highlightsStr;

    const operation = this.isEditMode
      ? this.dataService.updateProject(this.projectId!, projectData)
      : this.dataService.createProject(projectData);

    operation.subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: this.isEditMode ? 'Project updated' : 'Project created'
        });
        setTimeout(() => this.router.navigate(['/admin/dashboard/projects']), 1000);
      },
      error: () => {
        this.saving = false;
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save project' });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/dashboard/projects']);
  }
}
