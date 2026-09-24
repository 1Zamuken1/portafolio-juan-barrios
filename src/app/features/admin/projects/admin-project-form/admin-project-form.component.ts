import {
  Component,
  DestroyRef,
  ElementRef,
  Signal,
  afterNextRender,
  computed,
  inject,
  OnInit,
  signal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { startWith } from 'rxjs';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../../../core/services/data.service';
import { RedactorBorradorComponent } from '../redactor-borrador/redactor-borrador.component';
import { BlueprintViewerComponent } from '../../../../shared/components/blueprint-viewer/blueprint-viewer.component';
import { BlueprintEdge, BlueprintLayout, BlueprintNode } from '../../../../shared/models/project.model';
import { FichaVista, MetaFicha } from '../vista-ficha/ficha-vista';
import { Project, ProjectDraft } from '../../../../shared/models/project.model';
import { limpiarVacios } from '../../../../shared/utils/limpiar-vacios';
import { aSlug } from '../../../../shared/utils/slug';

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

/** Esta lleno si tiene algo: texto con contenido, o un numero. */
const lleno = (v: unknown): boolean =>
  typeof v === 'number' ? true : typeof v === 'string' ? v.trim().length > 0 : v != null;

/**
 * Las secciones de la ficha, con los campos que cuentan para saber cuanto
 * falta en cada una. Viven aqui y no en la plantilla para que el indice y las
 * cabeceras de cada seccion cuenten lo mismo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ValorFicha = any;
const SECCIONES_FICHA: ReadonlyArray<{
  id: string;
  titulo: string;
  icono: string;
  campos: (v: ValorFicha) => unknown[];
  total?: number;
}> = [
  { id: 'identidad', titulo: 'Identidad', icono: 'pi pi-id-card',
    campos: (v) => [v.name, v.slug, v.year, v.status, v.role, v.type, v.teamSize, v.displayOrder] },
  { id: 'descripciones', titulo: 'Descripciones', icono: 'pi pi-align-left',
    campos: (v) => [v.shortDescription, v.fullDescription] },
  { id: 'listas', titulo: 'Listas', icono: 'pi pi-list',
    campos: (v) => [v.featuresText, v.highlightsText, v.keywordsText] },
  // El despliegue y la descarga cuentan como uno: la ficha ensenia uno u
  // otro, nunca los dos, asi que tener los dos no esta "mas lleno".
  { id: 'enlaces', titulo: 'Enlaces', icono: 'pi pi-link',
    campos: (v) => [v.links?.github, v.links?.live || v.links?.download, v.imageUrl] },
  { id: 'arquitectura', titulo: 'Arquitectura', icono: 'pi pi-sitemap',
    campos: (v) => [v.coreArchitecture, v.databaseArchitecture, v.aiArchitecture] },
  { id: 'caso', titulo: 'Caso de estudio', icono: 'pi pi-book',
    campos: (v) => Object.values(v.readmeMarkdown ?? {}) },
  // El prompt pide entre tres y cuatro, asi que tres ya es la seccion llena.
  { id: 'desafios', titulo: 'Desafíos', icono: 'pi pi-flag', total: 3,
    campos: (v) => (v.challenges ?? [])
      .map((c: { title: string; description: string }) => lleno(c.title) && lleno(c.description) ? 1 : null) }
];

/** Las cinco partes del caso de estudio, con el id de su campo. */
const PARTES_CASO = [
  { clave: 'objective', titulo: 'Objetivo', id: 'rmObjective' },
  { clave: 'architecture', titulo: 'Arquitectura', id: 'rmArchitecture' },
  { clave: 'mainFeatures', titulo: 'Funcionalidades principales', id: 'rmMainFeatures' },
  { clave: 'technologies', titulo: 'Tecnologías', id: 'rmTechnologies' },
  { clave: 'learnings', titulo: 'Aprendizajes', id: 'rmLearnings' }
];

import { MessageService } from 'primeng/api';
import { TabsModule } from 'primeng/tabs';
import { PRIMENG_FORMULARIO } from '../../primeng';

@Component({
  selector: 'app-admin-project-form',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgTemplateOutlet, ...PRIMENG_FORMULARIO, TabsModule, RedactorBorradorComponent, BlueprintViewerComponent],
  templateUrl: './admin-project-form.component.html',
  styleUrls: ['../../admin.css', './admin-project-form.component.css']
})
export class AdminProjectFormComponent implements OnInit {
  form!: FormGroup;
  isEditMode = false;
  projectId: number | null = null;
  loading = signal(false);
  saving = signal(false);

  /** Los campos que escribio el borrador y todavia no has tocado. */
  rellenados = signal<Set<string>>(new Set());

  /**
   * En que paso esta la ficha.
   *
   * Dos, y en este orden: primero se redacta y despues se completa. En un
   * proyecto nuevo el formulario son treinta campos en blanco y casi todos los
   * de prosa salen del borrador, asi que empezar por ahi es empezar por donde
   * hay trabajo hecho. En uno que ya existe se entra por el segundo: el
   * contenido ya esta y redactar es la excepcion.
   */
  paso = signal<1 | 2>(1);

  /** Lo que el redactor necesita saber del formulario. Se toma al entrar en
   *  el primer paso y no en cada tecla: el redactor no escribe en el
   *  formulario, y leerlo en vivo solo serviria para moverle la vista. */
  pista = signal('');
  actual = signal<FichaVista | null>(null);

  /**
   * El diagrama del proyecto. No es un control del formulario: son nodos con
   * coordenadas, que no se editan a mano aqui. Se guarda solo si lo propuso
   * la IA en esta visita (`diagramaPropuesto`); si no, no viaja, y el backend
   * conserva el que hubiera.
   */
  diagrama = signal<{ nodes: BlueprintNode[]; edges: BlueprintEdge[]; layout?: BlueprintLayout } | null>(null);
  diagramaPropuesto = signal(false);
  private diagramaGuardado: { nodes: BlueprintNode[]; edges: BlueprintEdge[]; layout?: BlueprintLayout } | null = null;
  meta = signal<MetaFicha>({});

  protected readonly SECCIONES = SECCIONES_FICHA;
  protected readonly SECCIONES_CASO = PARTES_CASO;

  /** El valor del formulario como senial, para que el indice y la tarjeta
   *  se muevan al escribir. */
  protected valor!: Signal<ValorFicha>;

  /** La seccion que se esta mirando, para marcarla en el indice. */
  protected seccionActiva = signal('identidad');

  /** Cuantos campos tiene llenos cada seccion. */
  private cuentas = computed(() => {
    const v = this.valor();
    return Object.fromEntries(SECCIONES_FICHA.map((s) => {
      const campos = s.campos(v);
      const total = s.total ?? campos.length;
      return [s.id, { llenos: Math.min(total, campos.filter(lleno).length), total }];
    })) as Record<string, { llenos: number; total: number }>;
  });

  protected total = computed(() => Object.values(this.cuentas())
    .reduce((t, c) => ({ llenos: t.llenos + c.llenos, total: t.total + c.total }), { llenos: 0, total: 0 }));

  protected cuenta(id: string): { llenos: number; total: number } {
    return this.cuentas()[id];
  }

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
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  private destroyRef = inject(DestroyRef);

  constructor() {
    this.initForm();
    this.valor = toSignal(this.form.valueChanges.pipe(startWith(this.form.value)), { requireSync: true });

    // Marca en el indice la seccion que ocupa la parte alta de la pantalla.
    // La raiz es el area de contenido del panel, que es la que se desplaza:
    // con la ventana como raiz no se enteraria de nada.
    afterNextRender(() => {
      const raiz = this.host.nativeElement.closest('.dashboard-content');
      const observador = new IntersectionObserver((entradas) => {
        const visible = entradas.find((e) => e.isIntersecting);
        if (visible) this.seccionActiva.set(visible.target.id.replace('seccion-', ''));
      }, { root: raiz, rootMargin: '-15% 0px -70% 0px' });

      this.host.nativeElement.querySelectorAll('.seccion').forEach((s) => observador.observe(s));
      this.destroyRef.onDestroy(() => observador.disconnect());
    });
  }

  irASeccion(id: string): void {
    this.seccionActiva.set(id);
    this.host.nativeElement.querySelector(`#seccion-${id}`)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  ngOnInit(): void {

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.projectId = +id;
      this.loadProject(this.projectId);
    } else {
      this.proponerOrden();
    }

    this.irA(this.isEditMode ? 2 : 1);
  }

  /**
   * Un proyecto nuevo va al final: el orden por defecto era 0, y todo lo
   * creado desde el panel salia el primero de la lista. Si no se puede
   * preguntar al backend se queda en 0, como antes.
   */
  private proponerOrden(): void {
    this.dataService.getProjects().subscribe({
      next: (proyectos) => {
        const control = this.form.get('displayOrder');
        if (!control || control.dirty) return;
        const ultimo = proyectos.reduce((m, p) => Math.max(m, p.displayOrder ?? 0), 0);
        control.setValue(ultimo + 1);
      },
      error: () => undefined
    });
  }

  /** Cambia de paso. Al entrar en el primero, le cuenta al redactor como esta
   *  ahora la ficha. */
  irA(paso: 1 | 2): void {
    if (paso === 1) {
      const v = this.form.value;
      this.pista.set(v.name ?? '');
      this.meta.set({ type: v.type, status: v.status, year: v.year });
      // Solo se ensenia lo que ya hay si hay algo: en un proyecto nuevo, una
      // vista previa "actual" con todo vacio seria una ficha en blanco con
      // otro nombre.
      this.actual.set(this.isEditMode && v.name ? {
        name: v.name,
        shortDescription: v.shortDescription,
        fullDescription: v.fullDescription,
        readmeMarkdown: { ...v.readmeMarkdown },
        challenges: v.challenges,
        features: aLista(v.featuresText),
        highlights: aLista(v.highlightsText),
        keywords: aLista(v.keywordsText),
        coreArchitecture: v.coreArchitecture ?? '',
        databaseArchitecture: v.databaseArchitecture ?? '',
        aiArchitecture: v.aiArchitecture ?? '',
        github: v.links?.github ?? '',
        diagrama: this.diagrama() ?? undefined
      } : null);
    }
    this.cambiarDePaso(paso);
  }

  /** Lo que emiten las pestanas de PrimeNG: el valor de la elegida. */
  alCambiarPaso(valor: unknown): void {
    this.irA(valor === 2 ? 2 : 1);
  }

  /**
   * Cada paso empieza por arriba. Los dos comparten el mismo contenedor de
   * desplazamiento, y sin esto aceptar una propuesta dejaba el formulario
   * abierto a la altura donde estaba la barra de acciones del redactor: a
   * media ficha, sin ver por donde empezar.
   */
  private cambiarDePaso(paso: 1 | 2): void {
    const cambia = this.paso() !== paso;
    this.paso.set(paso);
    if (cambia) this.host.nativeElement.scrollIntoView({ block: 'start' });
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

          this.diagramaGuardado = project.architectureNodes?.length
            ? { nodes: project.architectureNodes, edges: project.architectureEdges ?? [], layout: project.architectureLayout }
            : null;
          this.diagrama.set(this.diagramaGuardado);
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
   * Pasa la propuesta al formulario. Sigue sin guardarse nada.
   *
   * Los campos que escribe quedan marcados hasta que los toques o guardes, para
   * poder distinguir de un vistazo lo redactado de lo que ya habia.
   */
  aplicarPropuesta(borrador: ProjectDraft): void {
    this.form.patchValue({
      name: borrador.name,
      shortDescription: borrador.shortDescription,
      fullDescription: borrador.fullDescription,
      readmeMarkdown: borrador.readmeMarkdown
    });

    this.challenges.clear();
    (borrador.challenges ?? []).forEach((c) =>
      this.agregarChallenge(c.title, c.description));

    // Las listas y la arquitectura solo entran si el borrador trae algo.
    // Vacias quieren decir "el readme no lo dice", y borrar con eso lo que ya
    // hubiera escrito seria perder un dato por no tener otro.
    const extra: Record<string, string> = {};
    const lineas: [keyof ProjectDraft, string][] = [
      ['features', 'featuresText'], ['highlights', 'highlightsText'], ['keywords', 'keywordsText']
    ];
    for (const [origen, destino] of lineas) {
      const lista = borrador[origen] as string[] | undefined;
      if (lista?.length) extra[destino] = aLineas(lista);
    }
    for (const campo of ['coreArchitecture', 'databaseArchitecture', 'aiArchitecture'] as const) {
      const texto = borrador[campo]?.trim();
      if (texto) extra[campo] = texto;
    }
    this.form.patchValue(extra);

    // El repositorio, con la misma regla: solo si llega. El backend ya tiro el
    // que no estaba escrito en el readme.
    const github = borrador.links?.github?.trim();
    if (github) {
      this.form.patchValue({ links: { github } });
      extra['linkGithub'] = github;
    }

    if (borrador.architectureNodes?.length) {
      this.diagrama.set({
        nodes: borrador.architectureNodes,
        edges: borrador.architectureEdges ?? [],
        layout: borrador.architectureLayout
      });
      this.diagramaPropuesto.set(true);
    }

    this.rellenados.set(new Set([
      'name', 'shortDescription', 'fullDescription',
      'objective', 'architecture', 'mainFeatures', 'technologies', 'learnings',
      'challenges', ...Object.keys(extra)
    ]));

    this.cambiarDePaso(2);

    this.messageService.add({
      severity: 'success',
      summary: 'Campos rellenados',
      detail: 'Revisalos y completa el resto. Todavia no se ha guardado nada.',
      life: 6000
    });
  }

  /** Vuelve al diagrama que habia antes de la propuesta, o a ninguno. */
  descartarDiagrama(): void {
    this.diagrama.set(this.diagramaGuardado);
    this.diagramaPropuesto.set(false);
  }

  /** Si un campo lo escribio el borrador y todavia no se ha tocado. */
  loRellenoLaIa(campo: string): boolean {
    return this.rellenados().has(campo);
  }

  /** Al editar un campo deja de ser de la IA: ya es tuyo. */
  marcarComoMio(campo: string): void {
    if (!this.rellenados().has(campo)) return;
    this.rellenados.update((s) => {
      const copia = new Set(s);
      copia.delete(campo);
      return copia;
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;

    this.saving.set(true);
    const formValue = this.form.value;

    const { featuresText, highlightsText, keywordsText, ...resto } = formValue;

    const projectData: Project = {
      ...resto,
      // Sin slug, el espejo no puede emparejar el proyecto con su id.
      slug: (resto.slug ?? '').trim() || aSlug(resto.name ?? ''),
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

    const d = this.diagrama();
    if (this.diagramaPropuesto() && d) {
      projectData.architectureNodes = d.nodes;
      projectData.architectureEdges = d.edges;
      projectData.architectureLayout = d.layout;
    }

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
