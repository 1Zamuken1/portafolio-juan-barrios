import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { Project } from '../../../../shared/models/project.model';

/** Lista -> texto, una entrada por linea. */
const aLineas = (lista?: string[]): string => (lista ?? []).join('\n');

/**
 * Texto -> lista, partiendo por lineas.
 *
 * Antes se partia por comas, pero las viñetas del portafolio contienen comas
 * y una sola se convertia en tres al guardar. Es el mismo error que el
 * separador de dos barras que se retiro del backend: elegir como delimitador
 * un caracter que aparece en el contenido.
 */
const aLista = (texto?: string): string[] =>
  (texto ?? '').split(/\r?\n/).map((l) => l.trim()).filter((l) => l.length > 0);

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
  loading = signal(false);
  saving = signal(false);

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
      slug: [''],
      type: [''],
      shortDescription: ['', Validators.required],
      fullDescription: [''],
      role: [''],
      year: [new Date().getFullYear(), Validators.required],
      status: ['Draft', Validators.required],
      teamSize: [null],
      imageUrl: [''],
      displayOrder: [0],

      // Una entrada por linea. NO separadas por comas: el contenido lleva
      // comas y partir por ellas convirtio una vinieta en tres.
      featuresText: [''],
      highlightsText: [''],
      keywordsText: [''],

      links: this.fb.group({
        github: [''],
        live: ['']
      }),

      coreArchitecture: [''],
      databaseArchitecture: [''],
      aiArchitecture: [''],

      readmeMarkdown: this.fb.group({
        objective: [''],
        architecture: [''],
        mainFeatures: [''],
        technologies: [''],
        learnings: ['']
      })
    });
  }

  private loadProject(id: number): void {
    this.loading.set(true);
    this.dataService.getProjects().subscribe({
      next: (projects) => {
        const project = projects.find(p => p.id === id);
        if (project) {
          this.form.patchValue({
            ...project,
            links: {
              github: project.links?.github ?? '',
              live: project.links?.live ?? ''
            },
            readmeMarkdown: {
              objective: project.readmeMarkdown?.objective ?? '',
              architecture: project.readmeMarkdown?.architecture ?? '',
              mainFeatures: project.readmeMarkdown?.mainFeatures ?? '',
              technologies: project.readmeMarkdown?.technologies ?? '',
              learnings: project.readmeMarkdown?.learnings ?? ''
            },
            featuresText: aLineas(project.features),
            highlightsText: aLineas(project.highlights),
            keywordsText: aLineas(project.keywords)
          });
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load project' });
      }
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const formValue = this.form.value;
    
    const { featuresText, highlightsText, keywordsText, ...resto } = formValue;

    const projectData: Project = {
      ...resto,
      features: aLista(featuresText),
      highlights: aLista(highlightsText),
      keywords: aLista(keywordsText)
    };

    // Los campos que este formulario no maneja (diagramas, techStack,
    // structuredStack, rawMetrics, challenges) no se envian. El backend hace
    // una actualizacion parcial: lo que no llega se conserva.
    Object.keys(projectData).forEach((k) => {
      const v = (projectData as any)[k];
      if (v === '' || v === null) delete (projectData as any)[k];
    });

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
        this.saving.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to save project' });
      }
    });
  }

  cancel(): void {
    this.router.navigate(['/admin/dashboard/projects']);
  }
}
