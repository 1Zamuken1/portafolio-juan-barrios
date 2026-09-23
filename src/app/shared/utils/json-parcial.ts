/**
 * LEER UN JSON QUE TODAVIA SE ESTA ESCRIBIENDO.
 *
 * El redactor recibe la respuesta del modelo a trozos, y la vista previa quiere
 * ir ensenando cada campo segun sale. `JSON.parse` no sirve para eso: un objeto
 * a medias no es JSON, y cerrar las llaves a mano para engañarlo falla en
 * cuanto el corte cae dentro de una clave o de un escape.
 *
 * Esto recorre el texto como lo haria un parser normal, pero cuando se acaba
 * devuelve lo que llevaba leido en vez de fallar. Y cuenta dos cosas mas que
 * `JSON.parse` no sabe: que cadenas ya se cerraron y cual se estaba escribiendo
 * cuando llego el corte. Con eso la interfaz sabe que un campo esta terminado
 * porque vio su comilla de cierre, no porque suponga un orden.
 *
 * <p><b>Lo que sale de aqui es para mirar, no para guardar.</b> Un objeto a
 * medias no se valida. El borrador que se acepta sigue siendo el que el backend
 * manda entero y validado al final.
 */

export interface JsonParcial {
  /** Lo que se puede leer hasta ahora; `undefined` si todavia no hay nada. */
  valor: unknown;
  /**
   * Ruta de la cadena que se estaba escribiendo cuando se acabo el texto, o
   * `null` si el corte cayo fuera de una. Con puntos y los indices como un
   * segmento mas: `readmeMarkdown.objective`, `challenges.1.title`.
   */
  abierta: string | null;
  /** Las rutas de las cadenas que ya vieron su comilla de cierre. */
  cerradas: ReadonlySet<string>;
}

export function leerJsonParcial(texto: string): JsonParcial {
  // El modelo tiene prohibido poner texto alrededor, pero si lo hiciera lo
  // unico que se pierde es lo de antes de la primera llave. El backend lo
  // rechazaria igual al final; aqui no hay por que dejar la vista en blanco.
  const inicio = texto.indexOf('{');
  if (inicio < 0) return { valor: undefined, abierta: null, cerradas: new Set() };

  const lector = new Lector(texto, inicio);
  const valor = lector.valor('');
  return { valor, abierta: lector.abierta, cerradas: lector.cerradas };
}

const ESCAPES: Record<string, string> = {
  '"': '"', '\\': '\\', '/': '/', b: '\b', f: '\f', n: '\n', r: '\r', t: '\t'
};

class Lector {
  abierta: string | null = null;
  readonly cerradas = new Set<string>();

  constructor(private readonly t: string, private i: number) {}

  valor(ruta: string): unknown {
    this.blancos();
    if (this.fin()) return undefined;

    switch (this.t[this.i]) {
      case '{': return this.objeto(ruta);
      case '[': return this.lista(ruta);
      case '"': return this.cadena(ruta);
      default: return this.literal();
    }
  }

  private objeto(ruta: string): Record<string, unknown> {
    this.i++;
    const obj: Record<string, unknown> = {};

    for (;;) {
      this.blancos();
      if (this.fin()) return obj;

      const c = this.t[this.i];
      if (c === '}') { this.i++; return obj; }
      if (c === ',') { this.i++; continue; }
      if (c !== '"') return this.romper(obj);

      // Una clave cortada a medias no es todavia ninguna clave: no se sabe a
      // que campo va a pertenecer lo que venga.
      const clave = this.leerCadena();
      if (!clave.cerrada) return obj;

      this.blancos();
      if (this.fin()) return obj;
      if (this.t[this.i] !== ':') return this.romper(obj);
      this.i++;

      const v = this.valor(unir(ruta, clave.texto));
      if (v !== undefined) obj[clave.texto] = v;
    }
  }

  private lista(ruta: string): unknown[] {
    this.i++;
    const lista: unknown[] = [];

    for (;;) {
      this.blancos();
      if (this.fin()) return lista;

      const c = this.t[this.i];
      if (c === ']') { this.i++; return lista; }
      if (c === ',') { this.i++; continue; }

      const v = this.valor(unir(ruta, String(lista.length)));
      if (v === undefined) return lista;
      lista.push(v);
    }
  }

  private cadena(ruta: string): string {
    const { texto, cerrada } = this.leerCadena();
    if (cerrada) this.cerradas.add(ruta);
    else this.abierta = ruta;
    return texto;
  }

  private leerCadena(): { texto: string; cerrada: boolean } {
    this.i++; // la comilla de apertura
    let texto = '';

    while (!this.fin()) {
      const c = this.t[this.i];

      if (c === '"') {
        this.i++;
        return { texto, cerrada: true };
      }

      if (c === '\\') {
        // Un escape partido por el corte se deja fuera entero: ensenar la
        // barra suelta, o media secuencia \u, seria ensenar algo que el
        // modelo no ha escrito.
        const siguiente = this.t[this.i + 1];
        if (siguiente === undefined) break;

        if (siguiente === 'u') {
          const hex = this.t.slice(this.i + 2, this.i + 6);
          if (hex.length < 4) break;
          texto += String.fromCharCode(parseInt(hex, 16));
          this.i += 6;
          continue;
        }

        texto += ESCAPES[siguiente] ?? siguiente;
        this.i += 2;
        continue;
      }

      texto += c;
      this.i++;
    }

    this.i = this.t.length;
    return { texto, cerrada: false };
  }

  /** Numeros, true, false y null. Aqui no se usan, pero no deben romper. */
  private literal(): unknown {
    const inicio = this.i;
    while (!this.fin() && /[-+.\w]/.test(this.t[this.i])) this.i++;

    // Un literal que llega hasta el final puede estar cortado --"12" de
    // "123", "tr" de "true"-- asi que no se da por leido.
    if (this.fin() || this.i === inicio) {
      this.i = this.t.length;
      return undefined;
    }

    try {
      return JSON.parse(this.t.slice(inicio, this.i));
    } catch {
      return this.romper(undefined);
    }
  }

  /** Algo que no es JSON: se para aqui y se devuelve lo que se llevaba. */
  private romper<T>(lo: T): T {
    this.i = this.t.length;
    return lo;
  }

  private blancos(): void {
    while (!this.fin() && /\s/.test(this.t[this.i])) this.i++;
  }

  private fin(): boolean {
    return this.i >= this.t.length;
  }
}

function unir(ruta: string, segmento: string): string {
  return ruta ? `${ruta}.${segmento}` : segmento;
}
