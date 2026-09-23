import {
  Component,
  ElementRef,
  afterRenderEffect,
  computed,
  effect,
  input,
  viewChild
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { FichaVista, MetaFicha, SECCIONES_CASO, SeccionCaso } from './ficha-vista';

/**
 * En que momento esta la vista previa. Cada uno se dibuja distinto porque dice
 * una cosa distinta de lo que se ve:
 *
 * - `vacia`: no hay nada todavia; los huecos estan quietos.
 * - `actual`: lo que ya tiene el proyecto, antes de redactar nada.
 * - `redactando`: el modelo esta escribiendo; los huecos laten y el campo que
 *   se esta escribiendo lleva cursor.
 * - `lista`: el borrador entero y validado, esperando a que lo aceptes.
 * - `aplicada`: ya esta en el formulario.
 * - `fallo`: se corto; lo que llego se queda, lo que no, como hueco quieto.
 */
export type ModoVista = 'vacia' | 'actual' | 'redactando' | 'lista' | 'aplicada' | 'fallo';

/** Los cuatro grupos de la vista, los mismos que las burbujas de salida. */
export type GrupoFicha = 'nombre' | 'descripciones' | 'caso' | 'desafios';

const ETIQUETA_MODO: Record<ModoVista, string> = {
  vacia: 'Vista previa',
  actual: 'Contenido actual',
  redactando: 'Escribiendo',
  lista: 'Propuesta',
  aplicada: 'En el formulario',
  fallo: 'Incompleta'
};

/** Que rutas del JSON caen en cada grupo. */
const RUTAS: Record<GrupoFicha, (ruta: string) => boolean> = {
  nombre: (r) => r === 'name',
  descripciones: (r) => r === 'shortDescription' || r === 'fullDescription',
  caso: (r) => r.startsWith('readmeMarkdown.'),
  desafios: (r) => r.startsWith('challenges.')
};

/**
 * La ficha publica, en pequeño, llenandose mientras el modelo escribe.
 *
 * <p>Se dibuja como se va a publicar --la cabecera con el nombre y la frase de
 * la tarjeta, y debajo el caso de estudio y los desafios-- porque lo que hay que
 * juzgar al aceptar un borrador no es si los campos estan rellenos, sino si la
 * ficha se lee bien. Eso no se ve en treinta cajas de formulario.
 *
 * <p>Los huecos estan desde el principio, tambien los de lo que no ha llegado:
 * la vista no cambia de forma al llenarse, solo se escribe. Es lo que el diseño
 * anterior no tenia, y por eso los cuadros aparecian y desaparecian.
 */
@Component({
  selector: 'app-vista-ficha',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './vista-ficha.component.html',
  styleUrl: './vista-ficha.component.css'
})
export class VistaFichaComponent {
  ficha = input.required<FichaVista>();
  /** Ruta de la cadena que se esta escribiendo, para poner ahi el cursor. */
  abierta = input<string | null>(null);
  modo = input<ModoVista>('vacia');
  meta = input<MetaFicha>({});
  /** Id del proyecto si ya existe, para la direccion de la barra. */
  proyectoId = input<number | null>(null);

  protected readonly SECCIONES = SECCIONES_CASO;
  protected readonly etiquetaModo = computed(() => ETIQUETA_MODO[this.modo()]);

  /** Anchos de los huecos, en %. Irregulares a proposito: lineas del mismo
   *  largo se leen como una tabla, no como un parrafo. */
  protected readonly HUECO_TITULO = [58];
  protected readonly HUECO_FRASE = [88, 54];
  protected readonly HUECO_PARRAFO = [100, 96, 91, 64];
  protected readonly HUECO_CORTO = [100, 72];
  protected readonly HUECO_DESAFIO = [46];

  /** Cuantos desafios se dibujan como hueco mientras no llega ninguno. El
   *  prompt pide entre tres y cuatro. */
  protected readonly DESAFIOS_HUECO = [0, 1, 2];

  private cuerpo = viewChild<ElementRef<HTMLElement>>('cuerpo');

  /**
   * Si la vista sigue sola al campo que se esta escribiendo.
   *
   * Se apaga en cuanto la persona desplaza la vista a mano: si quiere leer el
   * objetivo mientras se escriben los desafios, arrastrarla abajo en cada letra
   * seria pelearse con ella. Vuelve con cada redaccion nueva.
   */
  private seguir = true;

  constructor() {
    effect(() => {
      if (this.modo() === 'redactando') this.seguir = true;
    });

    // Al terminar, la vista vuelve arriba: siguiendo al cursor se quedo en los
    // desafios, y una propuesta se revisa empezando por el nombre.
    afterRenderEffect(() => {
      if (this.modo() !== 'lista') return;
      this.cuerpo()?.nativeElement.scrollTo({ top: 0, behavior: 'smooth' });
    });

    afterRenderEffect(() => {
      const ruta = this.abierta();
      if (this.modo() !== 'redactando' || !ruta || !this.seguir) return;
      this.asomar(ruta);
    });
  }

  protected texto(ruta: string): string {
    const f = this.ficha();
    const [raiz, hijo, campo] = ruta.split('.');

    if (raiz === 'readmeMarkdown') return f.readmeMarkdown?.[hijo as SeccionCaso] ?? '';
    if (raiz === 'challenges') {
      const c = f.challenges?.[+hijo];
      return (campo === 'title' ? c?.title : c?.description) ?? '';
    }
    return (f[raiz as 'name' | 'shortDescription' | 'fullDescription'] as string | undefined) ?? '';
  }

  /** En que punto esta un grupo, para la marca lateral. */
  protected estadoGrupo(grupo: GrupoFicha): 'escribiendo' | 'quieto' {
    const ruta = this.abierta();
    return this.modo() === 'redactando' && ruta && RUTAS[grupo](ruta) ? 'escribiendo' : 'quieto';
  }

  protected desafios = computed(() => this.ficha().challenges ?? []);

  /** Lleva la vista a un grupo y lo destaca un momento. Lo usa la pipeline
   *  al pulsar una burbuja de salida. */
  irA(grupo: GrupoFicha): void {
    const caja = this.cuerpo()?.nativeElement;
    const destino = caja?.querySelector<HTMLElement>(`[data-grupo="${grupo}"]`);
    if (!caja || !destino) return;

    this.seguir = false;
    caja.scrollTo({ top: posicionEn(caja, destino).top - 12, behavior: 'smooth' });

    destino.classList.remove('bloque--senalado');
    // Forzar el reflujo para que la animacion vuelva a empezar si se pulsa dos
    // veces seguidas la misma burbuja.
    void destino.offsetWidth;
    destino.classList.add('bloque--senalado');
  }

  protected dejarDeSeguir(): void {
    if (this.modo() === 'redactando') this.seguir = false;
  }

  /** Desplaza la vista lo justo para que se vea lo ultimo que se ha escrito. */
  private asomar(ruta: string): void {
    const caja = this.cuerpo()?.nativeElement;
    const campo = caja?.querySelector<HTMLElement>(`[data-ruta="${ruta}"]`);
    if (!caja || !campo) return;

    const margen = 48;
    const { top, bottom } = posicionEn(caja, campo);

    if (bottom + margen > caja.scrollTop + caja.clientHeight) {
      caja.scrollTop = bottom + margen - caja.clientHeight;
    } else if (top - margen < caja.scrollTop) {
      caja.scrollTop = top - margen;
    }
  }
}

/**
 * Donde esta un elemento dentro de una caja con desplazamiento, medido desde el
 * principio del contenido. offsetTop no sirve: es relativo al ancestro
 * posicionado mas cercano, y los bloques lo son para dibujar su marca lateral.
 */
function posicionEn(caja: HTMLElement, el: HTMLElement): { top: number; bottom: number } {
  const c = caja.getBoundingClientRect();
  const e = el.getBoundingClientRect();
  const top = e.top - c.top + caja.scrollTop;
  return { top, bottom: top + e.height };
}
