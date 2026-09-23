import type { LineaPipeline } from '../../../../core/services/borrador-stream.service';

/**
 * EL RITMO DE LA REDACCION.
 *
 * El backend manda el borrador tan rapido como lo escribe el modelo, a
 * rafagas, y en pantalla eso se lee como un bloque de texto cayendo de golpe.
 * Esto lo reparte: guarda lo que llega y lo va soltando a velocidad de lectura,
 * letra a letra, con una pausa breve al empezar cada campo. Los pasos de la
 * pipeline --JSON leido, cotas comprobadas-- esperan a que el texto que habia
 * antes de ellos se haya terminado de ver, y entre uno y otro pasa un minimo,
 * para que cada uno se vea ocurrir.
 *
 * <p><b>El ritmo es de la vista, no de los datos.</b> Nunca se ensenia algo
 * que el modelo no haya escrito: solo se ensenia mas tarde. Y tiene tope: si el
 * texto pendiente creciera tanto que la vista fuera a ir mas de
 * {@link RETRASO_MAX} segundos por detras, acelera. Un error no espera a
 * nadie: en cuanto llega se ensenia todo lo recibido y el fallo, porque hacer
 * esperar a quien ya no va a recibir nada seria mentirle.
 */

/** Letras por segundo cuando no hay prisa. Se lee comodo sin aburrir. */
export const VELOCIDAD = 90;

/** Segundos que, como mucho, puede ir la vista por detras de lo recibido. */
export const RETRASO_MAX = 5;

/** Milisegundos minimos entre dos pasos de la pipeline. */
export const PASO_MIN = 420;

/** Pausa al empezar a escribir un campo nuevo, en milisegundos. */
export const PAUSA_CAMPO = 240;

/** El principio del valor de un campo: la clave, los dos puntos y la comilla. */
const ABRE_VALOR = /":\s*"/g;

export interface OpcionesReproductor {
  /** Una linea del backend que no es texto, cuando le toca. */
  aplicar: (linea: LineaPipeline) => void;
  /** El texto que se ve ahora, cada vez que crece. */
  mostrar: (texto: string) => void;
  /** Sin animacion: lo que llega se ensenia al momento. Para quien pidio
   *  menos movimiento. */
  inmediato?: boolean;
  /** Si false, no arranca su propio reloj y hay que llamar a tic() a mano.
   *  Es para las pruebas. */
  automatico?: boolean;
  ahora?: () => number;
}

export class Reproductor {
  private recibido = '';
  private mostrados = 0;
  /** Donde acaba cada trozo recibido y cuando llego: el tope de retraso se
   *  mide por trozo, no sobre el total. */
  private llegadas: { fin: number; en: number }[] = [];
  private cola: { linea: LineaPipeline; en: number }[] = [];
  private ultimoPaso: number;
  private ultimoTic: number;
  private pausaHasta = 0;
  private reloj?: ReturnType<typeof setInterval>;
  private alAcabar?: () => void;
  private cerrado = false;
  private parado = false;

  constructor(private readonly op: OpcionesReproductor) {
    const ahora = this.ahora();
    this.ultimoPaso = ahora;
    this.ultimoTic = ahora;
  }

  recibir(linea: LineaPipeline): void {
    if (this.parado) return;

    if (linea.etapa === 'error') {
      this.vaciar();
      this.op.aplicar(linea);
      return;
    }

    if (linea.etapa === 'texto') {
      this.recibido += linea.detalle ?? '';
      this.llegadas.push({ fin: this.recibido.length, en: this.ahora() });
    } else this.cola.push({ linea, en: this.recibido.length });

    if (this.op.inmediato) this.vaciar();
    else this.arrancar();
  }

  /**
   * El flujo se acabo. Cuando se haya terminado de ensenar todo, se llama a
   * `hecho`: es la forma de saber que el backend cerro sin decir 'fin'.
   */
  cerrar(hecho: () => void): void {
    this.cerrado = true;
    this.alAcabar = hecho;
    if (this.op.inmediato || this.pendiente() === 0) this.acabarSiToca();
    else this.arrancar();
  }

  /** Ensenia de golpe todo lo que habia llegado y aplica lo que esperaba. */
  vaciar(): void {
    this.mostrarHasta(this.recibido.length);
    for (const { linea } of this.cola.splice(0)) this.op.aplicar(linea);
    this.acabarSiToca();
  }

  /** Para del todo. Lo que quedaba pendiente se tira. */
  parar(): void {
    this.parado = true;
    this.cola = [];
    this.detenerReloj();
  }

  /** Un paso del reloj. Publico para poder probarlo con un tiempo falso. */
  tic(ahora = this.ahora()): void {
    const dt = Math.max(0, (ahora - this.ultimoTic) / 1000);
    this.ultimoTic = ahora;

    if (this.mostrados < this.recibido.length && ahora >= this.pausaHasta) {
      const pendiente = this.recibido.length - this.mostrados;
      let hasta = Math.min(this.recibido.length, this.mostrados + this.velocidad(ahora) * dt);

      // Si en lo que toca ensenar empieza un campo nuevo, se para justo
      // despues de su comilla: el campo se abre, respira, y empieza a
      // escribirse. Es lo que hace que se lea como alguien escribiendo y no
      // como una cinta.
      const antes = Math.floor(this.mostrados);
      const tramo = this.recibido.slice(antes, Math.floor(hasta));
      ABRE_VALOR.lastIndex = 0;
      const abre = ABRE_VALOR.exec(tramo);
      if (abre && pendiente > 1) {
        hasta = antes + abre.index + abre[0].length;
        this.pausaHasta = ahora + PAUSA_CAMPO;
      }

      this.mostrarHasta(hasta);
    }

    while (this.cola.length
           && this.cola[0].en <= Math.floor(this.mostrados)
           && ahora - this.ultimoPaso >= PASO_MIN) {
      this.op.aplicar(this.cola.shift()!.linea);
      this.ultimoPaso = ahora;
    }

    this.acabarSiToca();
    if (this.pendiente() === 0 && !this.cola.length) this.detenerReloj();
  }

  /**
   * Letras por segundo ahora mismo. La de lectura, salvo que algun trozo vaya
   * a cumplir su tope sin haberse visto: entonces la justa para llegar a
   * tiempo. Cada trozo tiene que verse, como mucho, RETRASO_MAX segundos
   * despues de llegar.
   */
  private velocidad(ahora: number): number {
    while (this.llegadas.length && this.llegadas[0].fin <= this.mostrados) this.llegadas.shift();

    let velocidad = VELOCIDAD;
    for (const { fin, en } of this.llegadas) {
      const quedan = Math.max(0.03, (en + RETRASO_MAX * 1000 - ahora) / 1000);
      velocidad = Math.max(velocidad, (fin - this.mostrados) / quedan);
    }
    return velocidad;
  }

  private mostrarHasta(hasta: number): void {
    const antes = Math.floor(this.mostrados);
    this.mostrados = hasta;
    const ahora = Math.floor(hasta);
    if (ahora > antes) this.op.mostrar(this.recibido.slice(0, ahora));
  }

  private pendiente(): number {
    return this.recibido.length - Math.floor(this.mostrados);
  }

  private acabarSiToca(): void {
    if (!this.cerrado || this.cola.length || this.pendiente() > 0 || !this.alAcabar) return;
    const hecho = this.alAcabar;
    this.alAcabar = undefined;
    this.detenerReloj();
    hecho();
  }

  private arrancar(): void {
    if (this.reloj !== undefined || this.op.automatico === false) return;
    this.ultimoTic = this.ahora();
    this.reloj = setInterval(() => this.tic(), 30);
  }

  private detenerReloj(): void {
    if (this.reloj === undefined) return;
    clearInterval(this.reloj);
    this.reloj = undefined;
  }

  private ahora(): number {
    return this.op.ahora?.() ?? performance.now();
  }
}
