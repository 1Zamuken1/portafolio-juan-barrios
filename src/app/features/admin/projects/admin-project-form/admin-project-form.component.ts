import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { ReadmeGithubService } from '../../../../core/services/readme-github.service';
import { Project } from '../../../../shared/models/project.model';
import { limpiarVacios } from '../../../../shared/utils/limpiar-vacios';

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

/** Longitud minima de readme que el backend acepta. Se comprueba aqui para no
 *  gastar una llamada de pago en un texto que ya se sabe que va a rechazar. */
const README_MINIMO = 200;

/** Tope para el fichero que se sube. Un readme largo ronda los 20 kB; medio
 *  mega ya no es un readme, y leerlo entero en memoria no tiene sentido. */
const MARKDOWN_MAXIMO = 512 * 1024;

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
  styleUrls: ['../../admin.css', './admin-project-form.component.css']
})
export class AdminProjectFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  projectId: number | null = null;
  loading = signal(false);
  saving = signal(false);

  /**
   * El readme de origen para redactar el borrador. Va fuera del formulario a
   * proposito: no es un campo del proyecto, es material de entrada y no se
   * guarda en ningun sitio.
   */
  readmeFuente = new FormControl('');
  redactando = signal(false);
  panelBorradorAbierto = signal(false);

  /**
   * El enlace del repositorio del que traer el readme.
   *
   * Es una comodidad, no una tercera via: lo que se trae aterriza en
   * readmeFuente y desde ahi sigue el mismo camino que el texto pegado a mano.
   * Asi solo hay un sitio donde mirar lo que se le va a mandar al modelo, y se
   * puede corregir antes de gastar la llamada.
   */
  enlaceRepo = new FormControl('');
  trayendo = signal(false);

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
  private readmeGithub = inject(ReadmeGithubService);

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
        live: [''],
        download: ['']
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
      }),

      // Cada challenge es un par de campos, no una linea con separador: ya se
      // aprendio con las comas que meter un delimitador dentro del contenido
      // acaba partiendo lo que no debia.
      challenges: this.fb.array([])
    });
  }

  get challenges(): FormArray {
    return this.form.get('challenges') as FormArray;
  }

  agregarChallenge(title = '', description = ''): void {
    this.challenges.push(this.fb.group({ title: [title], description: [description] }));
  }

  quitarChallenge(indice: number): void {
    this.challenges.removeAt(indice);
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
              live: project.links?.live ?? '',
              download: project.links?.download ?? ''
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

          // patchValue no rellena un FormArray vacio: hay que crear los
          // controles antes. Si esto faltara, abrir un proyecto y guardarlo
          // mandaria la lista vacia y se perderian sus challenges.
          this.challenges.clear();
          (project.challenges ?? []).forEach((c) =>
            this.agregarChallenge(c.title, c.description));
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: 'Failed to load project' });
      }
    });
  }

  /**
   * Pide un borrador al backend y lo vuelca en el formulario.
   *
   * No guarda: deja el texto puesto para revisarlo. Sobrescribe lo que hubiera
   * en los campos de prosa, y por eso el boton avisa antes cuando se esta
   * editando un proyecto que ya tiene contenido.
   */
  /** Trae el readme del repositorio y lo deja en el area de texto. */
  traerDeGithub(): void {
    const enlace = (this.enlaceRepo.value ?? '').trim();
    if (!enlace) {
      this.avisar('Pega la URL del repositorio, o escribe usuario/repo.');
      return;
    }

    this.trayendo.set(true);
    this.readmeGithub.traerReadme(enlace).subscribe({
      next: (texto) => {
        this.trayendo.set(false);
        this.readmeFuente.setValue(texto);
        this.messageService.add({
          severity: 'success',
          summary: 'Readme traido',
          detail: `${texto.length} caracteres. Revisalo; todavia no se ha redactado nada.`,
          life: 6000
        });
      },
      error: (e: Error) => {
        this.trayendo.set(false);
        this.messageService.add({
          severity: 'error',
          summary: 'No se pudo traer el readme',
          detail: e.message,
          life: 12000
        });
      }
    });
  }

  /**
   * Carga un .md del disco en el area de texto.
   *
   * Se lee en el navegador y no se sube a ningun sitio: el fichero nunca sale
   * del equipo, solo su contenido, y solo cuando se pulse Redactar.
   */
  subirMarkdown(evento: Event): void {
    const input = evento.target as HTMLInputElement;
    const fichero = input.files?.[0];
    // Se limpia siempre, y antes de cualquier return: si no, elegir dos veces
    // el mismo fichero no dispara el evento y parece que la segunda no hizo
    // nada.
    input.value = '';
    if (!fichero) return;

    if (fichero.size > MARKDOWN_MAXIMO) {
      this.avisar(
        `El fichero pesa ${Math.round(fichero.size / 1024)} kB y el limite son ` +
        `${MARKDOWN_MAXIMO / 1024} kB. Un readme no llega a eso; revisa si es el fichero que querias.`);
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const texto = String(lector.result ?? '');
      this.readmeFuente.setValue(texto);
      this.messageService.add({
        severity: 'success',
        summary: 'Fichero cargado',
        detail: `${fichero.name}, ${texto.length} caracteres. Revisalo antes de redactar.`,
        life: 6000
      });
    };
    lector.onerror = () => this.avisar(`No se pudo leer ${fichero.name}.`);
    lector.readAsText(fichero);
  }

  redactarBorrador(): void {
    const nombre = (this.form.get('name')?.value ?? '').trim();
    const readme = (this.readmeFuente.value ?? '').trim();

    if (!nombre) {
      this.avisar('Escribe primero el nombre del proyecto: orienta la redaccion.');
      return;
    }
    if (readme.length < README_MINIMO) {
      this.avisar(
        `El readme es muy corto (${readme.length} caracteres, minimo ${README_MINIMO}). ` +
        'Con menos que eso el borrador se lo inventaria casi todo.');
      return;
    }
    if (this.isEditMode && !confirm(
      'Esto reemplaza las descripciones, las cinco secciones del readme y los ' +
      'challenges por lo que redacte el borrador. Los demas campos no se tocan. ' +
      'Nada se guarda hasta que pulses Guardar. Continuar?')) {
      return;
    }

    this.redactando.set(true);
    this.dataService.draftProject(nombre, readme).subscribe({
      next: (borrador) => {
        this.form.patchValue({
          shortDescription: borrador.shortDescription,
          fullDescription: borrador.fullDescription,
          readmeMarkdown: borrador.readmeMarkdown
        });

        this.challenges.clear();
        (borrador.challenges ?? []).forEach((c) =>
          this.agregarChallenge(c.title, c.description));

        this.redactando.set(false);
        this.panelBorradorAbierto.set(false);
        this.messageService.add({
          severity: 'success',
          summary: 'Borrador listo',
          detail: 'Revisalo antes de guardar. Todavia no se ha guardado nada.',
          life: 6000
        });
      },
      error: (respuesta) => {
        this.redactando.set(false);
        // El backend distingue dos casos y manda el motivo en el cuerpo: un
        // borrador que no sirve (422) se reintenta, un proveedor caido (503)
        // no tiene nada que revisar. Mostrar el mensaje tal cual es lo unico
        // que deja distinguirlos desde aqui.
        this.messageService.add({
          severity: 'error',
          summary: respuesta?.status === 503 ? 'Redactor no disponible' : 'No se pudo redactar',
          detail: respuesta?.error?.error ?? 'No se pudo contactar con el backend.',
          life: 10000
        });
      }
    });
  }

  private avisar(detalle: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Falta algo', detail: detalle, life: 7000 });
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
      keywords: aLista(keywordsText),
      challenges: (resto.challenges ?? [])
        .map((c: { title: string; description: string }) => ({
          title: (c.title ?? '').trim(),
          description: (c.description ?? '').trim()
        }))
        .filter((c: { title: string; description: string }) => c.title || c.description)
    };

    // Los campos que este formulario no maneja (diagramas, techStack,
    // structuredStack, rawMetrics) no se envian. El backend hace una
    // actualizacion parcial: lo que no llega se conserva, asi que lo vacio no
    // debe viajar. Ver limpiarVacios() para el porque de cada regla.
    const limpio = (limpiarVacios(projectData) ?? {}) as Project;

    const operation = this.isEditMode
      ? this.dataService.updateProject(this.projectId!, limpio)
      : this.dataService.createProject(limpio);

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
