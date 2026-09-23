import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CrecerConTextoDirective } from '../../crecer-con-texto.directive';

import { ReadmeGithubService } from '../../../../core/services/readme-github.service';
import {
  BorradorStreamService,
  LineaPipeline
} from '../../../../core/services/borrador-stream.service';
import { ProjectDraft } from '../../../../shared/models/project.model';
import { leerJsonParcial } from '../../../../shared/utils/json-parcial';
import { PipelineBorradorComponent } from '../pipeline-borrador/pipeline-borrador.component';
import { Reproductor } from './reproductor';
import { EstadoNodo, NodoPipeline } from '../pipeline-borrador/estado-nodo';
import { GrupoFicha, ModoVista, VistaFichaComponent } from '../vista-ficha/vista-ficha.component';
import {
  FichaVista,
  MetaFicha,
  SECCIONES_CASO,
  aFichaVista,
  fichaDeBorrador
} from '../vista-ficha/ficha-vista';

/** Longitud minima de readme que el backend acepta. Se comprueba aqui para no
 *  gastar una llamada de pago en un texto que ya se sabe que va a rechazar. */
export const README_MINIMO = 200;

/** Tope para el fichero que se sube. Un readme largo ronda los 20 kB; medio
 *  mega ya no es un readme, y leerlo entero en memoria no tiene sentido. */
const MARKDOWN_MAXIMO = 512 * 1024;

/**
 * Las burbujas del diagrama, en orden.
 *
 * Las cuatro primeras son los pasos: lo que pasa, por donde pasa. Las cuatro
 * ultimas son lo que sale, y cuelgan del modelo porque se escriben mientras
 * responde.
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
  { clave: 'desafios', titulo: 'Desafíos', icono: 'pi pi-flag' }
];

const RUTAS_CASO = SECCIONES_CASO.map((s) => `readmeMarkdown.${s.clave}`);

/**
 * Cuanto suele ocupar cada salida, en caracteres: el punto medio de las cotas
 * que pide el prompt (DraftPrompt.java). Sirve para dibujar cuanto lleva
 * escrito cada una. Es una estimacion y se dibuja como tal: la barra nunca
 * llega al final hasta que el campo se cierra de verdad.
 */
const TAMANO_ESPERADO: Record<string, number> = {
  nombre: 24,
  descripciones: 70 + 250,
  caso: 300 + 300 + 220 + 250 + 260,
  desafios: 3.5 * 200
};

const enEspera = (): NodoPipeline[] =>
  NODOS.map((n) => ({ ...n, estado: 'espera' as EstadoNodo, detalle: '' }));

/**
 * El primer paso de la ficha de un proyecto: darle un readme y ver como se
 * escribe.
 *
 * <p>Arriba, de donde sale el readme. Debajo, dos columnas que estan ahi desde
 * el principio y no cambian de forma: la pipeline de arriba abajo y la ficha
 * publica llenandose al lado. Lo que se escribe en la vista previa sale de leer
 * a medias el JSON que va mandando el modelo; <b>es para mirar, no para
 * guardar</b>. Lo que se acepta es el borrador que el backend manda entero y
 * validado al final.
 *
 * <p>Nunca toca el formulario. Emite el borrador cuando se acepta, y quien lo
 * usa decide que hacer con el.
 */
@Component({
  selector: 'app-redactor-borrador',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    FileUploadModule,
    InputGroupModule,
    InputGroupAddonModule,
    InputTextModule,
    TextareaModule,
    CrecerConTextoDirective,
    PipelineBorradorComponent,
    VistaFichaComponent
  ],
  templateUrl: './redactor-borrador.component.html',
  styleUrl: './redactor-borrador.component.css'
})
export class RedactorBorradorComponent implements OnDestroy {
  /** El nombre que ya haya escrito alguien. Se manda como pista y manda sobre
   *  lo que diga el readme; si esta vacio, el borrador lo redacta. */
  pista = input('');
  /** Lo que tiene ahora el proyecto, para ensenarlo antes de redactar. */
  actual = input<FichaVista | null>(null);
  meta = input<MetaFicha>({});
  proyectoId = input<number | null>(null);

  aceptar = output<ProjectDraft>();
  /** Ir al formulario sin redactar, o despues de aceptar. */
  completar = output<void>();

  private messageService = inject(MessageService);
  private readmeGithub = inject(ReadmeGithubService);
  private borradorStream = inject(BorradorStreamService);

  // ── La entrada ──────────────────────────────────────────────────────────

  /**
   * El readme que se le va a mandar al modelo.
   *
   * Las tres vias --pegarlo, traerlo de GitHub, subir un .md-- acaban aqui, en
   * la misma caja. Asi solo hay un sitio donde mirar lo que va a salir del
   * navegador, y se puede corregir antes de gastar la llamada.
   */
  readmeFuente = new FormControl('', { nonNullable: true });
  enlaceRepo = new FormControl('', { nonNullable: true });
  trayendo = signal(false);

  /** De donde vino el texto, para ponerlo en la barra del editor. */
  origen = signal<string>('');
  editorAbierto = signal(true);
  arrastrando = signal(false);

  protected readonly MINIMO = README_MINIMO;
  protected readonly MAXIMO_MD = MARKDOWN_MAXIMO;

  /** El largo del readme, para avisar antes de pulsar y no despues. */
  largo = signal(0);

  // ── La redaccion ────────────────────────────────────────────────────────

  redactando = signal(false);
  nodos = signal<NodoPipeline[]>(enEspera());

  /** El texto del borrador segun lo escribe el modelo, tal cual llega. */
  textoModelo = signal('');
  crudoAbierto = signal(false);

  /** El borrador terminado y validado, esperando a que lo aceptes. */
  propuesta = signal<ProjectDraft | null>(null);
  aplicada = signal(false);
  fallo = signal<string | null>(null);

  private suscripcion?: Subscription;
  private reproductor?: Reproductor;

  /**
   * El JSON leido a medias. Se recalcula con cada trozo que llega; un readme
   * da unos tres mil caracteres de respuesta, asi que releerlo entero cada vez
   * cuesta menos que llevar la cuenta de por donde iba.
   */
  private parcial = computed(() => leerJsonParcial(this.textoModelo()));

  modo = computed<ModoVista>(() => {
    if (this.redactando()) return 'redactando';
    if (this.propuesta()) return this.aplicada() ? 'aplicada' : 'lista';
    if (this.fallo()) return 'fallo';
    return this.actual() ? 'actual' : 'vacia';
  });

  /** Lo que dibuja la vista previa en cada momento. */
  ficha = computed<FichaVista>(() => {
    const p = this.propuesta();
    if (p) return fichaDeBorrador(p);
    if (this.redactando() || this.fallo()) return aFichaVista(this.parcial().valor);
    return this.actual() ?? {};
  });

  abierta = computed(() => (this.redactando() ? this.parcial().abierta : null));

  hechos = computed(() => this.nodos().filter((n) => n.estado === 'hecho').length);

  private vista = viewChild(VistaFichaComponent);
  private escenario = viewChild<ElementRef<HTMLElement>>('escenario');
  private crudo = viewChild<ElementRef<HTMLElement>>('crudo');
  private botonAceptar = viewChild('botonAceptar', { read: ElementRef<HTMLElement> });
  private subida = viewChild<FileUpload>('subida');

  constructor() {
    this.readmeFuente.valueChanges.subscribe((t) => this.largo.set(t.trim().length));

    // El texto en crudo crece por abajo: sin esto se ve el principio quieto
    // mientras lo interesante pasa fuera de la vista.
    effect(() => {
      this.textoModelo();
      const caja = this.crudo()?.nativeElement;
      if (caja) caja.scrollTop = caja.scrollHeight;
    });
  }

  ngOnDestroy(): void {
    this.suscripcion?.unsubscribe();
    this.reproductor?.parar();
  }

  corto(): boolean {
    return this.largo() < README_MINIMO;
  }

  irA(clave: string): void {
    this.vista()?.irA(clave as GrupoFicha);
  }

  // ── Traer el readme ─────────────────────────────────────────────────────

  traerDeGithub(): void {
    const enlace = this.enlaceRepo.value.trim();
    if (!enlace) {
      this.avisar('Pega la URL del repositorio, o escribe usuario/repo.');
      return;
    }

    this.trayendo.set(true);
    this.readmeGithub.traerReadme(enlace).subscribe({
      next: (texto) => {
        this.trayendo.set(false);
        this.cargar(texto, enlace.replace(/^https?:\/\/(www\.)?/, '').replace(/\/+$/, ''));
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
   * Carga un .md del disco en el editor.
   *
   * Se lee en el navegador y no se sube a ningun sitio: de p-fileupload solo se
   * usa el boton de elegir. Se vacia enseguida, y no por limpieza: si no,
   * elegir dos veces el mismo fichero no dispara nada y parece que la segunda
   * no hizo nada.
   */
  alElegirFichero(evento: { currentFiles?: File[]; files?: File[] }): void {
    const fichero = evento.currentFiles?.[0] ?? evento.files?.[0];
    this.subida()?.clear();
    if (fichero) this.leerFichero(fichero);
  }

  soltar(evento: DragEvent): void {
    evento.preventDefault();
    this.arrastrando.set(false);
    const fichero = evento.dataTransfer?.files?.[0];
    if (fichero) this.leerFichero(fichero);
  }

  sobrevolar(evento: DragEvent): void {
    // Solo se ofrece soltar si lo que se arrastra es un fichero; un trozo de
    // texto seleccionado tiene que poder soltarse en la caja como siempre.
    if (!evento.dataTransfer?.types.includes('Files')) return;
    evento.preventDefault();
    this.arrastrando.set(true);
  }

  private leerFichero(fichero: File): void {
    if (fichero.size > MARKDOWN_MAXIMO) {
      this.avisar(
        `El fichero pesa ${Math.round(fichero.size / 1024)} kB y el limite son ` +
        `${MARKDOWN_MAXIMO / 1024} kB. Un readme no llega a eso; revisa si es el fichero que querias.`);
      return;
    }

    const lector = new FileReader();
    lector.onload = () => this.cargar(String(lector.result ?? ''), fichero.name);
    lector.onerror = () => this.avisar(`No se pudo leer ${fichero.name}.`);
    lector.readAsText(fichero);
  }

  /** Deja un readme en el editor, abierto para revisarlo antes de redactar. */
  private cargar(texto: string, origen: string): void {
    this.readmeFuente.setValue(texto);
    this.origen.set(origen);
    this.editorAbierto.set(true);
    this.messageService.add({
      severity: 'success',
      summary: 'Readme cargado',
      detail: `${origen}, ${texto.length} caracteres. Revísalo; todavía no se ha redactado nada.`,
      life: 6000
    });
  }

  // ── Redactar ────────────────────────────────────────────────────────────

  redactar(): void {
    const readme = this.readmeFuente.value.trim();

    if (readme.length < README_MINIMO) {
      this.avisar(
        `El readme es muy corto (${readme.length} caracteres, minimo ${README_MINIMO}). ` +
        'Con menos que eso el borrador se lo inventaria casi todo.');
      return;
    }

    this.suscripcion?.unsubscribe();
    this.reproductor?.parar();
    this.propuesta.set(null);
    this.aplicada.set(false);
    this.fallo.set(null);
    this.textoModelo.set('');
    this.redactando.set(true);

    // Se pliega el editor: a partir de aqui lo que hay que mirar es lo de
    // abajo. Y se lleva la pantalla hasta ahi, que en un portatil queda justo
    // por debajo del borde.
    this.editorAbierto.set(false);
    requestAnimationFrame(() =>
      this.escenario()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' }));

    this.nodos.set(enEspera().map((n, i) =>
      // El primero arranca en curso: el backend no manda un aviso de "he
      // empezado", manda uno por cada paso terminado.
      i === 0 ? { ...n, estado: 'curso' as EstadoNodo, desde: Date.now() } : n));

    // Lo que llega no se aplica al llegar: pasa por el reproductor, que lo
    // suelta a ritmo de lectura. Ver reproductor.ts para lo que ese ritmo
    // puede y no puede hacer.
    const reproductor = this.reproductor = new Reproductor({
      aplicar: (linea) => this.avanzar(linea),
      mostrar: (texto) => {
        this.textoModelo.set(texto);
        this.revisarSalidas();
      },
      inmediato: typeof matchMedia === 'function'
        && matchMedia('(prefers-reduced-motion: reduce)').matches
    });

    this.suscripcion = this.borradorStream.redactar(this.pista().trim(), readme).subscribe({
      next: (linea) => reproductor.recibir(linea),
      error: (e: Error) => {
        reproductor.vaciar();
        this.redactando.set(false);
        this.marcarFallo(e.message);
        this.messageService.add({
          severity: 'error',
          summary: 'Se cortó la redacción',
          detail: e.message,
          life: 12000
        });
      },
      // El flujo puede acabarse sin 'fin' ni 'error' --un proxy que corta, un
      // despliegue a media respuesta--. Sin esto la vista se quedaria
      // "escribiendo" para siempre, que es justo lo que no se distingue de un
      // cuelgue.
      complete: () => reproductor.cerrar(() => {
        if (!this.redactando()) return;
        this.redactando.set(false);
        this.marcarFallo('La conexión se cerró antes de terminar.');
      })
    });
  }

  /** Corta la redaccion. La peticion se aborta de verdad, no solo se ignora. */
  cancelar(): void {
    this.suscripcion?.unsubscribe();
    this.reproductor?.parar();
    this.redactando.set(false);
    this.marcarFallo('Cancelada a mano.');
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

      case 'respuesta':
        this.cerrar('modelo', linea.detalle);
        // El modelo dejo de escribir, asi que lo ultimo que quedaba abierto ya
        // esta cerrado tambien.
        this.revisarSalidas();
        this.cerrarSiFalta('desafios');
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
   * Enciende las burbujas de salida segun se escribe cada campo.
   *
   * Un campo esta en marcha cuando su clave aparece en el texto, y terminado
   * cuando se ve la comilla que cierra su valor. Antes esto se deducia del
   * orden --ver la clave siguiente queria decir que la anterior se cerro-- y era
   * la unica suposicion de todo el diagrama. Leyendo el JSON a medias ya no hace
   * falta suponer nada.
   *
   * Los desafios son la excepcion: son una lista y no se sabe cuantos van a
   * venir, asi que se dan por terminados cuando el modelo deja de escribir.
   */
  private revisarSalidas(): void {
    const { valor, cerradas } = this.parcial();
    const f = aFichaVista(valor);
    const cerrada = (r: string) => cerradas.has(r);

    this.salida('nombre',
      f.name !== undefined,
      cerrada('name'),
      f.name ?? '',
      (f.name ?? '').length);

    const cortas = [f.shortDescription, f.fullDescription].filter((d) => d !== undefined) as string[];
    this.salida('descripciones',
      cortas.length > 0,
      cerrada('shortDescription') && cerrada('fullDescription'),
      cortas.map((d) => d.length).join(' + ') + ' caracteres',
      cortas.reduce((n, d) => n + d.length, 0));

    const secciones = RUTAS_CASO.filter(cerrada).length;
    this.salida('caso',
      f.readmeMarkdown !== undefined,
      secciones === RUTAS_CASO.length,
      `${secciones} de ${RUTAS_CASO.length} secciones`,
      Object.values(f.readmeMarkdown ?? {}).reduce((n, t) => n + (t?.length ?? 0), 0));

    const desafios = f.challenges?.length ?? 0;
    this.salida('desafios',
      f.challenges !== undefined,
      false,
      desafios === 1 ? '1 desafío' : `${desafios} desafíos`,
      (f.challenges ?? []).reduce((n, c) => n + (c.title?.length ?? 0) + (c.description?.length ?? 0), 0));
  }

  private salida(clave: string, empezada: boolean, terminada: boolean, detalle: string, escritos: number): void {
    const nodo = this.nodos().find((n) => n.clave === clave);
    if (!nodo || nodo.estado === 'hecho' || !empezada) return;

    if (terminada) {
      this.cerrar(clave, detalle);
      return;
    }
    // Solo se toca si cambia algo: esto se llama con cada letra que se ve.
    if (nodo.estado === 'espera' || nodo.detalle !== detalle) this.abrir(clave, detalle);
    // La barra se queda por debajo del final mientras el campo siga abierto:
    // que lleve lo esperado no quiere decir que haya terminado.
    const progreso = Math.min(0.95, escritos / TAMANO_ESPERADO[clave]);
    this.nodos.update((ns) => ns.map((n) => (n.clave === clave ? { ...n, progreso } : n)));
  }

  private cerrarSiFalta(clave: string): void {
    if (this.nodos().find((n) => n.clave === clave)?.estado !== 'hecho') this.cerrar(clave);
  }

  /**
   * Deja el borrador como propuesta. El formulario no se toca.
   *
   * Y lleva el foco al boton de aceptar. No es cortesia: el boton de redactar
   * se quedaba con el foco al terminar, y pulsar Enter o Espacio despues volvia
   * a lanzar la redaccion, que es una llamada de pago.
   */
  private proponer(borrador?: ProjectDraft): void {
    this.redactando.set(false);
    if (!borrador) {
      this.marcarFallo('El backend terminó sin mandar el borrador.');
      return;
    }

    this.propuesta.set(borrador);

    // Ahora que esta el JSON entero, cada burbuja de salida cuenta lo que de
    // verdad le toco, con los numeros del borrador validado y no los de la
    // lectura a medias.
    const r = borrador.readmeMarkdown;
    this.cerrar('nombre', borrador.name);
    this.cerrar('descripciones',
      `${borrador.shortDescription.length} + ${borrador.fullDescription.length} caracteres`);
    this.cerrar('caso',
      `${[r.objective, r.architecture, r.mainFeatures, r.technologies, r.learnings]
        .reduce((s, t) => s + t.length, 0)} caracteres en 5 secciones`);
    this.cerrar('desafios', borrador.challenges.length === 1
      ? '1 desafío'
      : `${borrador.challenges.length} desafíos`);

    setTimeout(() => this.botonAceptar()?.nativeElement.querySelector('button')?.focus());
  }

  aceptarPropuesta(): void {
    const p = this.propuesta();
    if (!p) return;
    this.aplicada.set(true);
    this.aceptar.emit(p);
  }

  /** Tira la propuesta. La vista vuelve a como estaba antes de redactar. */
  descartar(): void {
    this.propuesta.set(null);
    this.aplicada.set(false);
    this.fallo.set(null);
    this.textoModelo.set('');
    this.nodos.set(enEspera());
    this.editorAbierto.set(true);
  }

  // ── Los estados de cada nodo ────────────────────────────────────────────

  private abrir(clave: string, detalle?: string): void {
    this.cambiar(clave, 'curso', detalle);
  }

  private cerrar(clave: string, detalle?: string): void {
    this.cambiar(clave, 'hecho', detalle);
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
    this.fallo.set(detalle);
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

  private cambiar(clave: string, estado: EstadoNodo, detalle?: string): void {
    const ahora = Date.now();
    this.nodos.update((nodos) => nodos.map((n) => {
      if (n.clave !== clave) return n;

      const entra = estado === 'curso';
      return {
        ...n,
        estado,
        detalle: detalle ?? n.detalle,
        progreso: estado === 'hecho' ? 1 : n.progreso,
        // El cronometro arranca al entrar y se para al salir, quedandose con
        // lo que tardo: un contador subiendo al lado de algo terminado diria
        // que sigue trabajando, y uno que desaparece se lleva el dato.
        desde: entra ? (n.desde ?? ahora) : undefined,
        duracion: entra ? undefined : n.desde ? ahora - n.desde : n.duracion
      };
    }));
  }

  private avisar(detalle: string): void {
    this.messageService.add({ severity: 'warn', summary: 'Falta algo', detail: detalle, life: 7000 });
  }
}
