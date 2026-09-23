import {
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  output,
  signal
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { EstadoNodo, LECTURA_ESTADO, NodoPipeline } from './estado-nodo';

/** Cuantas barras tiene el espectro del modelo. */
const BARRAS = 30;

/** Que salida enciende cada clave del JSON, para la estacion del JSON. */
const CLAVES_JSON: ReadonlyArray<{ clave: string; salida: string }> = [
  { clave: 'name', salida: 'nombre' },
  { clave: 'shortDescription', salida: 'descripciones' },
  { clave: 'fullDescription', salida: 'descripciones' },
  { clave: 'readmeMarkdown', salida: 'caso' },
  { clave: 'challenges', salida: 'desafios' }
];

/**
 * La redaccion como una linea de montaje.
 *
 * <p>Cuatro estaciones unidas por un conducto: el readme entra, el modelo lo
 * convierte en texto, el JSON se lee y las cotas se comprueban. Por el tramo
 * que se esta recorriendo viaja un pulso. El modelo es la estacion grande
 * porque es donde pasa casi todo el tiempo: lleva un espectro que late con lo
 * que se va escribiendo, y dentro, las cuatro salidas como cartuchos que se
 * llenan.
 *
 * <p>Cada estacion ensenia algo propio y verdadero, no un icono generico: el
 * readme cuantas letras trae, el modelo la forma de lo que escribe, el JSON que claves
 * ya estan cerradas, las cotas cuantos campos se comprobaron. Todo sale de lo
 * que conto el backend o de lo que ya se ve escrito.
 *
 * <p>El contrato de siempre se mantiene: cada paso y cada salida es un
 * `.nodo` con `data-estado` y un `aria-label` que empieza por su nombre.
 */
@Component({
  selector: 'app-pipeline-borrador',
  standalone: true,
  imports: [NgTemplateOutlet, ButtonModule],
  templateUrl: './pipeline-borrador.component.html',
  styleUrl: './pipeline-borrador.component.css'
})
export class PipelineBorradorComponent implements OnDestroy {
  nodos = input.required<NodoPipeline[]>();
  /** Lo que lleva escrito el modelo, de lo que ya se ve. */
  texto = input('');

  /** Se pulso una salida: la vista previa se lleva hasta su parte. */
  elegir = output<string>();

  /**
   * Un reloj que corre solo mientras haya algo trabajando.
   *
   * Sin el, el tiempo se calcularia una vez al dibujar y se quedaria congelado
   * el resto del paso. Y se para cuando no hay nada corriendo: un intervalo
   * latiendo sobre una pantalla quieta es trabajo tirado.
   */
  protected ahora = signal(Date.now());
  private reloj?: ReturnType<typeof setInterval>;

  constructor() {
    effect(() => {
      const corriendo = this.nodos().some((n) => LECTURA_ESTADO[n.estado].corriendo);

      if (corriendo && this.reloj === undefined) {
        this.reloj = setInterval(() => this.ahora.set(Date.now()), 100);
      } else if (!corriendo && this.reloj !== undefined) {
        clearInterval(this.reloj);
        this.reloj = undefined;
      }
    });
  }

  ngOnDestroy(): void {
    if (this.reloj !== undefined) clearInterval(this.reloj);
  }

  private nodo(clave: string): NodoPipeline | undefined {
    return this.nodos().find((n) => n.clave === clave);
  }

  protected readme = computed(() => this.nodo('readme'));
  protected modelo = computed(() => this.nodo('modelo'));
  protected parseo = computed(() => this.nodo('parseo'));
  protected validacion = computed(() => this.nodo('validacion'));

  protected salidas = computed(() =>
    this.nodos().filter((n) => !['readme', 'modelo', 'parseo', 'validacion'].includes(n.clave)));

  protected lectura(estado: EstadoNodo) {
    return LECTURA_ESTADO[estado];
  }

  /**
   * Como se pinta el conducto que baja de una estacion a la siguiente.
   *
   * Se enciende --y lleva el pulso-- cuando lo de arriba ya paso y lo de abajo
   * esta en marcha, que es justo el rato en que se esta recorriendo. Queda
   * marcado como recorrido cuando lo de abajo termino.
   */
  protected conducto(desde?: NodoPipeline, hasta?: NodoPipeline): 'activo' | 'recorrido' | 'pendiente' {
    if (!desde || !hasta) return 'pendiente';
    if (hasta.estado === 'hecho') return 'recorrido';
    if (desde.estado === 'hecho' && hasta.estado === 'curso') return 'activo';
    return 'pendiente';
  }

  /**
   * Cuanto liquido tiene una estacion, de 0 a 1.
   *
   * El liquido es la metafora de toda la pipeline: sale del readme, baja por
   * los tubos y va llenando cada estacion segun trabaja. Una estacion llena es
   * una estacion terminada. El modelo se llena al ritmo de lo que lleva
   * escrito --la media de sus salidas--, que es lo unico de la pipeline que
   * avanza poco a poco; el resto sube a la mitad mientras trabaja y se llena
   * al acabar. Una que falla se vacia: el liquido se sale por la grieta.
   */
  protected nivel(nodo?: NodoPipeline): number {
    if (!nodo) return 0;
    switch (nodo.estado) {
      case 'hecho': return 1;
      case 'fallo': return 0.06;
      case 'espera':
      case 'no-alcanzado': return 0;
      case 'curso': {
        if (nodo.clave !== 'modelo') return 0.5;
        const salidas = this.salidas();
        const media = salidas.reduce((t, s) => t + (s.estado === 'hecho' ? 1 : s.progreso ?? 0), 0) / (salidas.length || 1);
        return 0.1 + 0.85 * media;
      }
    }
  }

  /** El tiempo al lado del estado: el que lleva, o el que tardo. */
  protected tiempo(nodo: NodoPipeline): string {
    if (LECTURA_ESTADO[nodo.estado].corriendo && nodo.desde) {
      // El reloj late cada 100 ms y el nodo puede haber entrado entre dos
      // latidos: sin el tope, recien abierto marcaria un tiempo negativo.
      return segundos(Math.max(0, this.ahora() - nodo.desde));
    }
    // Lo que entra y sale en el mismo trozo de texto no tardo nada que se
    // pueda medir, y "0.0 s" se lee como un fallo del cronometro.
    return nodo.duracion !== undefined && nodo.duracion >= 100 ? segundos(nodo.duracion) : '';
  }

  // ── El espectro del modelo ─────────────────────────────────────────────

  /**
   * Las barras del espectro, de 0 a 1: las ultimas letras que se han escrito.
   *
   * Cada barra es una letra, y los espacios y la puntuacion quedan bajos, asi
   * que lo que se ve pasar es la forma del texto --palabras, huecos, el salto
   * al empezar un campo-- y se para cuando la escritura se para. Antes era
   * cuantas letras salian en cada latido, y como el ritmo es casi constante,
   * dibujaba un peine.
   */
  protected barras = computed(() => {
    const cola = this.texto().slice(-BARRAS).padStart(BARRAS, ' ');
    return [...cola].map((c) => {
      if (!/[\p{L}\p{N}]/u.test(c)) return 0.1;
      // La altura de cada letra sale de su codigo: fija para cada letra, y
      // variada, que es lo que da la forma de onda.
      return 0.3 + ((c.codePointAt(0)! * 37) % 70) / 100;
    });
  });

  protected caracteres = computed(() => this.texto().length);

  // ── La estacion del JSON ───────────────────────────────────────────────

  protected claves = computed(() => {
    const estados = new Map(this.salidas().map((s) => [s.clave, s.estado]));
    return CLAVES_JSON.map((c) => ({ clave: c.clave, estado: estados.get(c.salida) ?? 'espera' }));
  });

  // ── La estacion de las cotas ───────────────────────────────────────────

  /**
   * Una marca por campo comprobado. El numero sale del detalle del backend
   * ("Los 12 campos caben..."), porque es el que sabe cuantos mira; si no lo
   * dice, se dibujan las ocho salidas de texto.
   */
  protected marcas = computed(() => {
    const n = +(this.validacion()?.detalle.match(/(\d+)\s+campos/)?.[1] ?? 8);
    return Array.from({ length: Math.min(n, 16) }, (_, i) => i);
  });
}

function segundos(ms: number): string {
  return `${(Math.floor(ms / 100) / 10).toFixed(1)} s`;
}
