import { Component, ElementRef, effect, inject, OnInit, signal, viewChild } from '@angular/core';
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
import {
  BorradorStreamService,
  LineaPipeline
} from '../../../../core/services/borrador-stream.service';
import { PipelineBorradorComponent } from '../pipeline-borrador/pipeline-borrador.component';
import { EstadoNodo, NodoPipeline } from '../pipeline-borrador/estado-nodo';
import { Project, ProjectDraft } from '../../../../shared/models/project.model';
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

/**
 * Las burbujas del diagrama, en orden.
 *
 * Las cuatro primeras son la cadena: lo que pasa, por donde pasa. Las cuatro
 * ultimas son lo que sale, y cuelgan de la validacion porque es cuando de
 * verdad se sabe que un campo sirve.
 *
 * Se pintan todas desde el principio, tambien las que no han ocurrido. Una
 * lista que crece no distingue "va por la tercera" de "se quedo en la
 * tercera", y lo segundo es justo lo que hay que poder ver.
 */
const NODOS: ReadonlyArray<{ clave: string; titulo: string; icono: string }> = [
  { clave: 'readme', titulo: 'Readme', icono: 'pi pi-file' },
  { clave: 'modelo', titulo: 'Modelo', icono: 'pi pi-sparkles' },
  { clave: 'parseo', titulo: 'JSON', icono: 'pi pi-code' },
  { clave: 'validacion', titulo: 'Cotas', icono: 'pi pi-check-square' },
  { clave: 'nombre', titulo: 'Nombre', icono: 'pi pi-tag' },
  { clave: 'descripciones', titulo: 'Descripciones', icono: 'pi pi-align-left' },
  { clave: 'caso', titulo: 'Caso de estudio', icono: 'pi pi-book' },
  { clave: 'desafios', titulo: 'Desafios', icono: 'pi pi-flag' }
];

/**
 * Cuando se da por cerrado cada campo de la salida.
 *
 * El modelo escribe el JSON en el orden en que se le pidio, asi que ver
 * aparecer la clave siguiente significa que la anterior ya se cerro. Eso deja
 * que las burbujas de salida se enciendan repartidas por los ocho segundos de
 * la llamada, en vez de las cuatro de golpe al final.
 *
 * Es la unica suposicion de todo el diagrama, y esta acotada a proposito: si
 * algun dia el modelo escribiera los campos en otro orden, lo peor que pasa es
 * que una burbuja se encienda tarde. Los datos no salen de aqui, salen del JSON
 * completo cuando termina.
 */
const CIERRA_CON: ReadonlyArray<{ clave: string; marca: string }> = [
  { clave: 'nombre', marca: '"shortDescription"' },
  { clave: 'descripciones', marca: '"readmeMarkdown"' },
  { clave: 'caso', marca: '"challenges"' }
];

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
    InputNumberModule,
    PipelineBorradorComponent
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

  /**
   * Por donde va la redaccion.
   *
   * Redactar tarda unos ocho segundos y casi todos son la llamada al modelo.
   * Con solo un boton girando no hay forma de distinguir "esta pensando" de
   * "se colgo", y cuando falla el motivo llega al final y de golpe. Esto no es
   * una animacion: cada linea la manda el backend al pasar por el paso, con el
   * dato que solo se conoce ahi --que modelo respondio, si hubo que bajar al de
   * reserva, cuanto tardo--.
   */
  nodos = signal<NodoPipeline[]>([]);

  /**
   * El texto del borrador segun lo escribe el modelo.
   *
   * Es lo unico que de verdad llena los ocho segundos de espera. Los pasos
   * dicen en que fase va; esto ensenia que hay algo saliendo.
   */
  textoModelo = signal('');

  /** Si se ensenia el texto en crudo. Abierto mientras escribe, que es cuando
   *  sirve de algo; despues se puede plegar porque ya estan los campos. */
  salidaAbierta = signal(true);

  /**
   * El borrador terminado, esperando a que lo aceptes.
   *
   * No entra en el formulario por su cuenta: al redactar sobre un proyecto que
   * ya tiene contenido, lo que habia se perdia sin haberlo visto.
   */
  propuesta = signal<ProjectDraft | null>(null);

  /** Los campos que escribio el borrador y todavia no has tocado. */
  rellenados = signal<Set<string>>(new Set());

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
  private borradorStream = inject(BorradorStreamService);

  private salidaCuerpo = viewChild<ElementRef<HTMLElement>>('salidaCuerpo');

  constructor() {
    // El texto crece por abajo y la caja mide 260px: sin esto se ve el
    // principio quieto mientras lo interesante --lo que se esta escribiendo
    // ahora-- pasa fuera de la vista.
    effect(() => {
      this.textoModelo();
      const caja = this.salidaCuerpo()?.nativeElement;
      if (caja) caja.scrollTop = caja.scrollHeight;
    });
  }

  ngOnInit(): void {
    this.initForm();

    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditMode = true;
      this.projectId = +id;
      this.loadProject(this.projectId);
    }

    // En un proyecto nuevo, lo primero es el readme. El formulario son treinta
    // campos en blanco y casi todos los de prosa salen del borrador: empezar
    // por ahi es empezar por donde hay trabajo hecho. En uno que ya existe el
    // panel arranca cerrado, porque ahi el contenido ya esta y redactar es la
    // excepcion.
    this.panelBorradorAbierto.set(!this.isEditMode);
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
    // El nombre ya no hace falta para empezar. Si esta escrito se manda como
    // pista y manda sobre lo que diga el readme; si no, el borrador lo redacta.
    // Exigirlo era poner un paso manual delante del automatico para pedir un
    // dato que casi siempre esta en el texto de entrada.
    const nombre = (this.form.get('name')?.value ?? '').trim();
    const readme = (this.readmeFuente.value ?? '').trim();

    if (readme.length < README_MINIMO) {
      this.avisar(
        `El readme es muy corto (${readme.length} caracteres, minimo ${README_MINIMO}). ` +
        'Con menos que eso el borrador se lo inventaria casi todo.');
      return;
    }

    // Ya no hay confirmacion antes de redactar sobre un proyecto que tiene
    // contenido: lo que sale no entra solo en el formulario, queda como
    // propuesta y hay que aceptarla. Preguntar dos veces por lo mismo sobra.
    this.propuesta.set(null);
    this.textoModelo.set('');

    this.redactando.set(true);
    this.nodos.set(NODOS.map((n, i) => ({
      ...n,
      // El primero arranca en curso: el backend no manda un aviso de "he
      // empezado", manda uno por cada paso terminado.
      estado: i === 0 ? 'curso' : 'espera',
      detalle: '',
      desde: i === 0 ? Date.now() : undefined
    })));

    this.borradorStream.redactar(nombre, readme).subscribe({
      next: (linea) => this.avanzar(linea),
      error: (e: Error) => {
        this.redactando.set(false);
        this.marcarFallo(e.message);
        this.messageService.add({
          severity: 'error',
          summary: 'Se corto la redaccion',
          detail: e.message,
          life: 12000
        });
      }
    });
  }

  /**
   * Mueve la pipeline con lo que acaba de contar el backend.
   *
   * Cada aviso cierra su paso y abre el siguiente. El de 'modelo' es la
   * excepcion: no dice que se termino de consultar, dice que se esta
   * consultando, y puede repetirse si Groq retiro el primero de la lista y hay
   * que bajar al de reserva. Por eso se queda en curso hasta que llega la
   * respuesta.
   */
  private avanzar(linea: LineaPipeline): void {
    switch (linea.etapa) {
      case 'entrada':
        this.cerrar('readme', linea.detalle);
        this.abrir('modelo');
        break;

      case 'modelo':
        this.abrir('modelo', linea.detalle);
        break;

      case 'texto':
        // Llega letra a letra segun lo escribe el modelo. Se acumula y se
        // enseina tal cual: es texto para mirar, no datos para usar. Nada de
        // esto toca el formulario, ni podria: un JSON a medias no se valida.
        this.textoModelo.update((t) => t + (linea.detalle ?? ''));
        this.revisarSalidas();
        break;

      case 'respuesta':
        this.cerrar('modelo', linea.detalle);
        // El modelo dejo de escribir, asi que lo ultimo que quedaba abierto ya
        // esta cerrado tambien.
        this.cerrar('desafios');
        this.abrir('parseo');
        break;

      case 'parseo':
        this.cerrar('parseo', linea.detalle);
        this.abrir('validacion');
        break;

      case 'validacion':
        this.cerrar('validacion', linea.detalle);
        break;

      case 'fin':
        this.proponer(linea.borrador);
        break;

      case 'error':
        this.redactando.set(false);
        this.marcarFallo(linea.detalle ?? 'Sin detalle.');
        this.messageService.add({
          severity: 'error',
          // Son dos situaciones distintas: un borrador que no sirve se
          // reintenta o se mejora el readme, un proveedor caido no tiene nada
          // que revisar. El backend las distingue y aqui se mantiene.
          summary: linea.tipo === 'nodisponible'
            ? 'Redactor no disponible'
            : 'No se pudo redactar',
          detail: linea.detalle ?? 'Sin detalle.',
          life: 12000
        });
        break;
    }
  }

  /**
   * Enciende las burbujas de salida segun el modelo va cerrando cada campo.
   *
   * Escribe el JSON en el orden en que se le pidio, asi que ver aparecer la
   * clave siguiente significa que la anterior se cerro. Es la unica suposicion
   * del diagrama y esta acotada: si el modelo cambiara el orden, lo peor es que
   * una burbuja se encienda tarde. El contenido de verdad llega al final, con
   * el JSON entero.
   */
  private revisarSalidas(): void {
    const texto = this.textoModelo();

    // En cuanto hay una letra, el modelo esta escribiendo el primer campo.
    this.abrirSiEspera('nombre');

    for (let i = 0; i < CIERRA_CON.length; i++) {
      if (!texto.includes(CIERRA_CON[i].marca)) break;

      this.cerrar(CIERRA_CON[i].clave);
      // Ver la clave siguiente significa que la anterior se cerro y que esta
      // acaba de empezar. El ultimo de la cadena no tiene ninguna detras: lo
      // cierra el final del flujo, en 'respuesta'.
      this.abrirSiEspera(CIERRA_CON[i + 1]?.clave ?? 'desafios');
    }
  }

  /**
   * Abre un nodo solo si todavia no habia pasado por el.
   *
   * Se llama en cada trozo de texto que llega, y sin esta guarda un nodo ya
   * terminado volveria a ponerse en marcha con cada letra posterior.
   */
  private abrirSiEspera(clave: string): void {
    if (this.nodos().find((n) => n.clave === clave)?.estado === 'espera') {
      this.abrir(clave);
    }
  }

  /**
   * Deja el borrador como propuesta. El formulario no se toca todavia.
   *
   * Antes se volcaba solo. Eso estaba bien mientras redactar era algo que se
   * hacia sobre un formulario vacio, pero al redactar sobre un proyecto que ya
   * tiene contenido, lo que habia se perdia sin haberlo visto. Ahora se ve
   * primero campo por campo y hay que aceptarlo.
   */
  private proponer(borrador?: ProjectDraft): void {
    this.redactando.set(false);
    if (!borrador) {
      this.marcarFallo('El backend termino sin mandar el borrador.');
      return;
    }

    this.propuesta.set(borrador);

    // Ahora que esta el JSON entero, cada burbuja de salida puede ensenar lo
    // que de verdad le toco. Hasta aqui solo se sabia que ya estaba escrito,
    // no que decia: un objeto a medias no se puede leer.
    const r = borrador.readmeMarkdown;
    const parrafos = (partes: string[]) => partes.join('\n\n');

    this.cerrar('nombre', 'El nombre del proyecto', borrador.name);

    this.cerrar('descripciones', 'La de la tarjeta y la de la ficha',
      parrafos([borrador.shortDescription, borrador.fullDescription]));

    this.cerrar('caso', 'Las cinco secciones del readme', parrafos([
      `Objetivo\n${r.objective}`,
      `Arquitectura\n${r.architecture}`,
      `Funcionalidades\n${r.mainFeatures}`,
      `Tecnologias\n${r.technologies}`,
      `Aprendizajes\n${r.learnings}`
    ]));

    this.cerrar('desafios', `${borrador.challenges.length} problemas tecnicos`,
      parrafos(borrador.challenges.map((c) => `${c.title}\n${c.description}`)));
  }

  /**
   * Pasa la propuesta al formulario. Sigue sin guardarse nada.
   *
   * Los campos que escribe quedan marcados hasta que los toques o guardes, para
   * poder distinguir de un vistazo lo redactado de lo que ya habia.
   */
  aplicarPropuesta(): void {
    const borrador = this.propuesta();
    if (!borrador) return;

    this.form.patchValue({
      name: borrador.name,
      shortDescription: borrador.shortDescription,
      fullDescription: borrador.fullDescription,
      readmeMarkdown: borrador.readmeMarkdown
    });

    this.challenges.clear();
    (borrador.challenges ?? []).forEach((c) =>
      this.agregarChallenge(c.title, c.description));

    this.rellenados.set(new Set([
      'name', 'shortDescription', 'fullDescription',
      'objective', 'architecture', 'mainFeatures', 'technologies', 'learnings',
      'challenges'
    ]));

    this.propuesta.set(null);
    this.panelBorradorAbierto.set(false);

    this.messageService.add({
      severity: 'success',
      summary: 'Campos rellenados',
      detail: 'Revisalos y completa el resto. Todavia no se ha guardado nada.',
      life: 6000
    });
  }

  /** Tira la propuesta sin tocar el formulario. */
  descartarPropuesta(): void {
    this.propuesta.set(null);
    this.textoModelo.set('');
    this.nodos.set([]);
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

  private abrir(clave: string, detalle?: string): void {
    this.cambiar(clave, 'curso', detalle);
  }

  private cerrar(clave: string, detalle?: string, contenido?: string): void {
    this.cambiar(clave, 'hecho', detalle, contenido);
  }

  /**
   * Marca donde se paro la redaccion.
   *
   * <p><b>Un solo nodo se lleva el fallo</b>, y eso hay que decidirlo porque
   * puede haber dos trabajando a la vez: mientras el modelo escribe, la burbuja
   * del modelo y la del campo que esta saliendo estan las dos en curso. La
   * primera version marcaba todas, asi que un corte a media escritura pintaba
   * dos burbujas en rojo diciendo cada una "aqui es donde se corto", que es
   * precisamente la contradiccion que la declaracion de estados existe para
   * impedir.
   *
   * <p>El fallo es de la primera en orden, que siempre es la de la cadena: lo
   * que se rompe son los pasos del backend, y las de salida solo reflejan lo
   * que iba escribiendose. Esas se quedan en "no se llego".
   *
   * <p>Y lo que no habia empezado tambien pasa a "no se llego", que no es lo
   * mismo que "sin empezar": uno todavia podia ocurrir y el otro ya no. Sin esa
   * diferencia, un diagrama parado se lee igual que uno que no ha arrancado.
   */
  private marcarFallo(detalle: string): void {
    this.nodos.update((nodos) => {
      const culpable = nodos.find((n) => n.estado === 'curso')?.clave;

      return nodos.map((n) => {
        if (n.clave === culpable) {
          return { ...n, estado: 'fallo' as EstadoNodo, detalle, desde: undefined };
        }
        if (n.estado === 'curso' || n.estado === 'espera') {
          return { ...n, estado: 'no-alcanzado' as EstadoNodo, desde: undefined };
        }
        return n;
      });
    });
  }

  private cambiar(clave: string, estado: EstadoNodo, detalle?: string, contenido?: string): void {
    this.nodos.update((nodos) => nodos.map((n) =>
      n.clave === clave
        ? {
            ...n,
            estado,
            detalle: detalle ?? n.detalle,
            contenido: contenido ?? n.contenido,
            // El cronometro arranca al entrar y desaparece al salir: un
            // contador subiendo al lado de algo terminado diria que sigue
            // trabajando.
            desde: estado === 'curso' ? (n.desde ?? Date.now()) : undefined
          }
        : n));
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
