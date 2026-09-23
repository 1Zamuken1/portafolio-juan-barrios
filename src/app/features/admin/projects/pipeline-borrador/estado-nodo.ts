/**
 * COMO SE LLAMA CADA ESTADO DE UN NODO, Y COMO SE DIBUJA.
 *
 * Una sola declaracion para todas las superficies que nombran un estado. Vive
 * aparte porque el mismo estado se dice dos veces: la burbuja del diagrama y el
 * panel lateral hablan del mismo nodo, y si cada uno tuviera su texto, el dia
 * que se cambiara uno el panel estaria contando dos cosas distintas del mismo
 * paso.
 *
 * El mapa es exhaustivo sobre {@link EstadoNodo} y todos los campos son
 * obligatorios, asi que un estado nuevo no se puede anadir sin decidir como se
 * lee --incluido si hace falta una glosa, que es una decision y no algo que se
 * pueda saltar en silencio--.
 */

export type EstadoNodo =
  /** Todavia no le ha tocado; puede pasar. */
  | 'espera'
  /** Esta ocurriendo ahora. */
  | 'curso'
  /** Termino bien. */
  | 'hecho'
  /** Reviento aqui. */
  | 'fallo'
  /** La ejecucion se paro antes de llegar; ya no va a pasar. */
  | 'no-alcanzado';

export interface LecturaEstado {
  /** El nombre del estado, alli donde se muestre. */
  readonly etiqueta: string;
  /** Su glifo. Uno por estado, para que dos superficies no dibujen la misma
   *  cosa con figuras distintas. */
  readonly icono: string;
  /** Su color, como variable del tema: la lectura sobrevive al cambio de tema. */
  readonly color: string;
  /**
   * Lo que hay que decir ADEMAS del nombre, o `null` cuando el nombre ya es
   * todo. Nunca un campo ausente: "este no necesita glosa" es una respuesta.
   */
  readonly glosa: string | null;
  /**
   * Si el estado sigue ocurriendo. Un nodo asi dibuja una marca en movimiento y
   * cuanto lleva, y la marca desaparece en cuanto deja de ser verdad.
   *
   * Obligatorio en vez de deducido del icono, para que un estado nuevo tenga
   * que contestar si se mueve en lugar de quedarse quieto sin que nadie lo
   * decidiera.
   */
  readonly corriendo: boolean;
}

export const LECTURA_ESTADO: Record<EstadoNodo, LecturaEstado> = {
  espera: {
    etiqueta: 'Sin empezar',
    icono: 'pi pi-circle',
    color: 'var(--text-tertiary)',
    // La distincion con 'no-alcanzado': este todavia puede pasar, asi que decir
    // que no aporto nada seria hablar del futuro.
    glosa: 'la redaccion no ha llegado hasta aqui',
    corriendo: false
  },
  curso: {
    etiqueta: 'Trabajando',
    icono: 'pi pi-spin pi-spinner',
    color: 'var(--text-accent)',
    // El dato que quiere quien espera un paso lento: empezo y no ha vuelto.
    // Cuanto lleva va al lado, en las dos superficies que dicen esto.
    glosa: 'la redaccion esta aqui ahora mismo',
    corriendo: true
  },
  hecho: {
    etiqueta: 'Listo',
    icono: 'pi pi-check',
    color: 'var(--estado-ok)',
    glosa: null,
    corriendo: false
  },
  fallo: {
    etiqueta: 'Se paro aqui',
    icono: 'pi pi-times',
    color: 'var(--estado-fallo)',
    // Se dice aqui porque el color por si solo no separa "fallo esto" de "esto
    // ni se intento", y los dos aparecen a la vez en el mismo diagrama.
    glosa: 'aqui es donde se corto la redaccion',
    corriendo: false
  },
  'no-alcanzado': {
    etiqueta: 'No se llego',
    icono: 'pi pi-minus',
    color: 'var(--text-tertiary)',
    glosa: 'la redaccion se paro antes, asi que esto no ocurrio',
    corriendo: false
  }
};

/** Un nodo del diagrama. */
export interface NodoPipeline {
  clave: string;
  titulo: string;
  /** Clase del icono que va dentro de la burbuja. */
  icono: string;
  estado: EstadoNodo;
  /** Lo que conto el backend al pasar por aqui. Vacio hasta que pase. */
  detalle: string;
  /** Cuando entro en curso, para poder decir cuanto lleva. */
  desde?: number;
  /** Solo en los nodos de salida: el texto que redacto el modelo. */
  contenido?: string;
}
