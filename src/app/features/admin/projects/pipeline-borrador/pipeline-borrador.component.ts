import {
  Component,
  OnDestroy,
  computed,
  effect,
  input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { EstadoNodo, LECTURA_ESTADO, NodoPipeline } from './estado-nodo';

/**
 * El diagrama de la redaccion: se ve por donde va y que va saliendo.
 *
 * <p>Cuatro pasos en linea --el readme, el modelo, el parseo y la validacion--
 * y, colgando del ultimo, las cuatro cosas que salen. Los que salen no se
 * encienden todos de golpe al final: el modelo escribe el JSON en el orden en
 * que se le pidio, asi que cada uno se enciende cuando su campo termino de
 * escribirse, repartidos por los ocho segundos que dura la llamada.
 *
 * <p><b>Nada de esto es una animacion que finge progreso.</b> Cada cambio viene
 * de una linea que mando el backend. El unico sitio donde hay una suposicion es
 * en cuando se da por cerrado un campo de la salida, y esta explicada en
 * {@link PipelineBorradorComponent#cerrados}: si el modelo escribiera los campos
 * en otro orden, lo peor que pasa es que una burbuja se encienda tarde. Los
 * datos siguen saliendo del JSON completo al final.
 */
@Component({
  selector: 'app-pipeline-borrador',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pipeline-borrador.component.html',
  styleUrl: './pipeline-borrador.component.css'
})
export class PipelineBorradorComponent implements OnDestroy {
  nodos = input.required<NodoPipeline[]>();

  /** El que se esta mirando en el panel de al lado. */
  private elegido = signal<string | null>(null);

  /**
   * Un reloj que corre solo mientras haya algo trabajando.
   *
   * Sin el, el tiempo se calcularia una vez al dibujar y se quedaria congelado
   * el resto del paso, que es justo lo que una senial de "esto sigue vivo" no
   * puede hacer nunca. Y se para cuando no hay nada corriendo: un intervalo
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

  /**
   * El nodo que se ensenia al lado.
   *
   * Si no has elegido ninguno, sigue al que esta trabajando: asi los resultados
   * van apareciendo solos segun caen, que es para lo que existe el panel. En
   * cuanto pulsas uno, manda tu eleccion y deja de moverse bajo el cursor.
   */
  protected activo = computed<NodoPipeline | null>(() => {
    const lista = this.nodos();
    if (!lista.length) return null;

    const elegido = this.elegido();
    if (elegido) return lista.find((n) => n.clave === elegido) ?? null;

    return lista.find((n) => LECTURA_ESTADO[n.estado].corriendo)
      ?? lista.find((n) => n.estado === 'fallo')
      ?? [...lista].reverse().find((n) => n.estado === 'hecho')
      ?? lista[0];
  });

  protected lectura(estado: EstadoNodo) {
    return LECTURA_ESTADO[estado];
  }

  protected elegir(clave: string): void {
    this.elegido.update((actual) => (actual === clave ? null : clave));
  }

  protected esElegido(clave: string): boolean {
    return this.activo()?.clave === clave;
  }

  /** Cuanto lleva trabajando un nodo, en segundos con un decimal. */
  protected llevaCorriendo(nodo: NodoPipeline): string {
    if (!nodo.desde) return '';
    const ms = this.ahora() - nodo.desde;
    return `${Math.floor(ms / 100) / 10} s`;
  }

  // ── El dibujo ────────────────────────────────────────────────────────────
  //
  // Las posiciones son fijas y estan aqui y no en la plantilla porque los
  // caminos entre burbujas se calculan a partir de ellas: con las coordenadas
  // escritas a mano en el SVG, mover una burbuja dejaba su linea colgando en el
  // sitio de antes.

  /** Los cuatro pasos de la cadena, de izquierda a derecha. */
  protected readonly CADENA = ['readme', 'modelo', 'parseo', 'validacion'];

  // El lienzo mide 600 unidades de ancho y se dibuja en una columna de unos
  // 510 pixeles, asi que la escala queda cerca de 1:1 y los rotulos se leen. La
  // primera version usaba 860 y todo salia al 60%: las burbujas se veian, pero
  // debajo de cada una habia un borron.
  private static readonly CADENA_X = [46, 152, 258, 364];
  private static readonly SALIDA_X = 508;
  private static readonly SALIDA_Y0 = 34;
  private static readonly SALIDA_PASO = 72;
  protected readonly RADIO = 20;

  /**
   * La cadena va a la altura del centro del abanico.
   *
   * Calculada y no fija: con la cadena arriba, el abanico caia entero hacia
   * abajo y la mitad izquierda del lienzo quedaba vacia. Centrada, las ramas
   * salen hacia arriba y hacia abajo por igual y el dibujo ocupa el sitio que
   * tiene. Se recalcula sola si algun dia cambia el numero de salidas.
   */
  private cadenaY = computed(() =>
    PipelineBorradorComponent.SALIDA_Y0
    + Math.max(0, this.salidas().length - 1) * PipelineBorradorComponent.SALIDA_PASO / 2);

  protected posicion(clave: string): { x: number; y: number } {
    const enCadena = this.CADENA.indexOf(clave);
    if (enCadena >= 0) {
      return { x: PipelineBorradorComponent.CADENA_X[enCadena], y: this.cadenaY() };
    }

    const enSalida = this.salidas().findIndex((n) => n.clave === clave);
    return {
      x: PipelineBorradorComponent.SALIDA_X,
      y: PipelineBorradorComponent.SALIDA_Y0
        + Math.max(0, enSalida) * PipelineBorradorComponent.SALIDA_PASO
    };
  }

  protected salidas = computed(() =>
    this.nodos().filter((n) => !this.CADENA.includes(n.clave)));

  protected enCadena = computed(() =>
    this.nodos().filter((n) => this.CADENA.includes(n.clave)));

  /**
   * Los caminos entre burbujas, ya calculados.
   *
   * Cada uno sabe de donde sale y adonde llega, para poder pintarlo encendido
   * mientras la redaccion lo esta recorriendo: un camino que se mueve es lo que
   * dice que esto sigue vivo cuando ninguna burbuja ha cambiado todavia.
   */
  protected caminos = computed(() => {
    const estados = new Map(this.nodos().map((n) => [n.clave, n.estado]));
    const tramos: { d: string; desde: string; hasta: string }[] = [];

    for (let i = 0; i < this.CADENA.length - 1; i++) {
      const a = this.posicion(this.CADENA[i]);
      const b = this.posicion(this.CADENA[i + 1]);
      tramos.push({
        d: `M ${a.x + this.RADIO + 6} ${a.y} L ${b.x - this.RADIO - 6} ${b.y}`,
        desde: this.CADENA[i],
        hasta: this.CADENA[i + 1]
      });
    }

    // El abanico: todo lo que sale cuelga de la validacion, que es cuando de
    // verdad se sabe que un campo sirve.
    const raiz = this.posicion('validacion');
    for (const salida of this.salidas()) {
      const p = this.posicion(salida.clave);
      const x0 = raiz.x + this.RADIO + 6;
      const x1 = p.x - this.RADIO - 6;
      const medio = x0 + (x1 - x0) / 2;
      tramos.push({
        d: `M ${x0} ${raiz.y} C ${medio} ${raiz.y}, ${medio} ${p.y}, ${x1} ${p.y}`,
        desde: 'validacion',
        hasta: salida.clave
      });
    }

    return tramos.map((t) => ({
      ...t,
      // Un camino se enciende cuando lo que tiene detras ya paso y lo de
      // delante todavia no: ese es exactamente el rato en que se esta
      // recorriendo.
      activo: estados.get(t.desde) === 'hecho' && estados.get(t.hasta) === 'curso',
      recorrido: estados.get(t.hasta) === 'hecho'
    }));
  });

  /** Alto del lienzo, para que crezca si algun dia hay mas salidas. */
  protected alto = computed(() =>
    PipelineBorradorComponent.SALIDA_Y0
    + Math.max(1, this.salidas().length - 1) * PipelineBorradorComponent.SALIDA_PASO
    + this.RADIO
    + 34);
}
