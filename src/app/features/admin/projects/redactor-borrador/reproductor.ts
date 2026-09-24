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
 * que el modelo no haya escrito: solo se ensenia mas tarde. Y tiene tope:
 * ningun trozo se ve mas de {@link RETRASO_MAX} segundos despues de llegar.
 *
 * <p><b>Un error no espera, pero tampoco se salta el orden.</b> La primera
 * version lo ensenaba todo de golpe al llegar un fallo, y los pasos que si
 * habian ido bien --el modelo, el JSON-- aparecian terminados en tres
 * milisegundos. Ahora el error ocupa su sitio en la cola y lo que queda
 * delante se acelera para verse en {@link PRISA} segundos.
 *
 * <p><b>Un reintento empieza un tramo nuevo.</b> Cuando el backend pide el
 * borrador otra vez, el texto que llega despues no es la continuacion del
 * anterior: es otro borrador. Se guarda aparte y empieza a ensenarse de cero
 * cuando se ha terminado de ver el primero.
 */

/** Letras por segundo cuando no hay prisa. Se lee comodo sin aburrir. */
export const VELOCIDAD = 90;

/** Segundos que, como mucho, puede ir la vista por detras de lo recibido. */
export const RETRASO_MAX = 5;

/** Milisegundos minimos entre dos pasos de la pipeline. */
export const PASO_MIN = 420;

/** Pausa al empezar a escribir un campo nuevo, en milisegundos. */
export const PAUSA_CAMPO = 240;

/** Con un error en la cola, segundos en que se termina de ensenar lo pendiente. */
export const PRISA = 1.2;

/** El principio del valor de un campo: la clave, los dos puntos y la comilla. */
const ABRE_VALOR = /":\s*"/g;

export interface OpcionesReproductor {
  /** Una linea del backend que no es texto, cuando le toca. */
  aplicar: (linea: LineaPipeline) => void;
  /** El texto del tramo actual que se ve ahora, cada vez que crece. */
  mostrar: (texto: string) => void;
  /** Sin animacion: lo que llega se ensenia al momento. Para quien pidio
   *  menos movimiento. */
  inmediato?: boolean;
  /** Si false, no arranca su propio reloj y hay que llamar a tic() a mano.
   *  Es para las pruebas. */
  automatico?: boolean;
  ahora?: () => number;
}

interface EnCola {
  linea: LineaPipeline;
  /** El tramo al que pertenece y hasta donde tiene que verse antes. */
  tramo: number;
  en: number;
  /** Si al aplicarse se pasa al tramo siguiente (un reintento). */
  corte: boolean;
}

export class Reproductor {
  /** El texto de cada intento. Normalmente uno; dos si hubo reintento. */
  private tramos: string[] = [''];
  /** El tramo que se esta ensenando y el que esta recibiendo. */
  private actual = 0;
  private ultimo = 0;
  private mostrados = 0;
  /** Donde acaba cada trozo recibido y cuando llego: el tope de retraso se
   *  mide por trozo, no sobre el total. */
  private llegadas: { tramo: number; fin: number; en: number }[] = [];
  private cola: EnCola[] = [];
  private ultimoPaso: number;
  private ultimoTic: number;
  private pausaHasta = 0;
  private prisa = false;
  /** Cuando tiene que haberse visto todo, si hay un error esperando. Un plazo
   *  fijo y no "lo pendiente entre PRISA" recalculado en cada latido, que
   *  frena exponencialmente y no termina nunca. */
  private prisaHasta = 0;
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

    if (linea.etapa === 'texto') {
      this.tramos[this.ultimo] += linea.detalle ?? '';
      this.llegadas.push({ tramo: this.ultimo, fin: this.tramos[this.ultimo].length, en: this.ahora() });
    } else {
      const corte = linea.etapa === 'reintento';
      this.cola.push({ linea, tramo: this.ultimo, en: this.tramos[this.ultimo].length, corte });
      if (corte) this.tramos[++this.ultimo] = '';
      if (linea.etapa === 'error' && !this.prisa) {
        this.prisa = true;
        this.prisaHasta = this.ahora() + PRISA * 1000;
      }
    }

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
    if (this.op.inmediato || this.terminado()) this.acabarSiToca();
    else this.arrancar();
  }

  /** Ensenia de golpe todo lo que habia llegado y aplica lo que esperaba. */
  vaciar(): void {
    for (;;) {
      this.mostrarHasta(this.tramos[this.actual].length);
      const siguiente = this.cola[0];
      if (!siguiente) break;
      this.cola.shift();
      this.op.aplicar(siguiente.linea);
      if (siguiente.corte) this.pasarDeTramo();
    }
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
    const texto = this.tramos[this.actual];

    if (this.mostrados < texto.length && (ahora >= this.pausaHasta || this.prisa)) {
      const pendiente = texto.length - this.mostrados;
      let hasta = Math.min(texto.length, this.mostrados + this.velocidad(ahora) * dt);

      // Si en lo que toca ensenar empieza un campo nuevo, se para justo
      // despues de su comilla: el campo se abre, respira, y empieza a
      // escribirse. Es lo que hace que se lea como alguien escribiendo y no
      // como una cinta. Con prisa no hay pausas.
      if (!this.prisa) {
        const antes = Math.floor(this.mostrados);
        ABRE_VALOR.lastIndex = 0;
        const abre = ABRE_VALOR.exec(texto.slice(antes, Math.floor(hasta)));
        if (abre && pendiente > 1) {
          hasta = antes + abre.index + abre[0].length;
          this.pausaHasta = ahora + PAUSA_CAMPO;
        }
      }

      this.mostrarHasta(hasta);
    }

    const paso = this.prisa ? PASO_MIN / 4 : PASO_MIN;
    while (this.cola.length && this.toca(this.cola[0]) && ahora - this.ultimoPaso >= paso) {
      const siguiente = this.cola.shift()!;
      this.op.aplicar(siguiente.linea);
      if (siguiente.corte) this.pasarDeTramo();
      this.ultimoPaso = ahora;
    }

    this.acabarSiToca();
    if (this.terminado()) this.detenerReloj();
  }

  /** Si lo que va delante de un paso ya se ha visto entero. */
  private toca(e: EnCola): boolean {
    return e.tramo < this.actual || (e.tramo === this.actual && e.en <= Math.floor(this.mostrados));
  }

  private pasarDeTramo(): void {
    this.actual++;
    this.mostrados = 0;
    this.pausaHasta = 0;
  }

  /**
   * Letras por segundo ahora mismo. La de lectura, salvo que algun trozo vaya
   * a cumplir su tope sin haberse visto --entonces la justa para llegar a
   * tiempo-- o que haya un error esperando, que se termina en PRISA segundos.
   */
  private velocidad(ahora: number): number {
    const pendiente = this.tramos[this.actual].length - this.mostrados;
    if (this.prisa) {
      // Lo que queda de todos los tramos, no solo del actual: tiene que caber
      // entero en el plazo.
      const resto = pendiente + this.tramos.slice(this.actual + 1).reduce((n, t) => n + t.length, 0);
      const quedan = Math.max(0.03, (this.prisaHasta - ahora) / 1000);
      return Math.max(VELOCIDAD, resto / quedan);
    }

    this.llegadas = this.llegadas.filter((l) => l.tramo > this.actual
      || (l.tramo === this.actual && l.fin > this.mostrados));

    let velocidad = VELOCIDAD;
    for (const { tramo, fin, en } of this.llegadas) {
      if (tramo !== this.actual) continue;
      const quedan = Math.max(0.03, (en + RETRASO_MAX * 1000 - ahora) / 1000);
      velocidad = Math.max(velocidad, (fin - this.mostrados) / quedan);
    }
    return velocidad;
  }

  private mostrarHasta(hasta: number): void {
    const antes = Math.floor(this.mostrados);
    this.mostrados = hasta;
    const ahora = Math.floor(hasta);
    if (ahora > antes) this.op.mostrar(this.tramos[this.actual].slice(0, ahora));
  }

  private terminado(): boolean {
    return !this.cola.length
      && this.actual === this.ultimo
      && Math.floor(this.mostrados) >= this.tramos[this.actual].length;
  }

  private acabarSiToca(): void {
    if (!this.cerrado || !this.terminado() || !this.alAcabar) return;
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
