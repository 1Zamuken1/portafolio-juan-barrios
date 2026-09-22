/**
 * Coordina las dos direcciones entre el scroll y la URL.
 *
 * En la ficha de un proyecto hay dos flujos que se pisan:
 *
 *   1. El usuario pulsa una sección en el explorador → cambia el fragmento de
 *      la URL → hay que desplazar la vista hasta esa sección.
 *   2. El usuario hace scroll a mano → GSAP detecta qué sección entra → hay que
 *      escribir ese fragmento en la URL.
 *
 * Sin coordinación se realimentan: desplazar por (1) dispara (2), que reescribe
 * la URL con la sección por la que va pasando la animación, que vuelve a
 * disparar (1). La vista se queda a medio camino, en una sección que nadie
 * pidió.
 *
 * **Antes se resolvía con temporizadores**: una bandera que se limpiaba a los
 * 1000 ms y otra a los 50 ms. Los dos números eran suposiciones sobre cuánto
 * tarda un scroll suave y cuánto tarda el router. Si el scroll tardaba más
 * —página larga, móvil lento— la bandera se limpiaba a media animación y la URL
 * quedaba secuestrada; si tardaba menos, el scroll del usuario no actualizaba la
 * URL durante el resto del segundo.
 *
 * Aquí no se mide tiempo: cada operación se abre y se cierra explícitamente,
 * y quien la abre recibe la función que la cierra. El componente la llama
 * cuando el navegador dice que el scroll termino (`scrollend`) y cuando el
 * router resuelve la navegación, que son hechos y no estimaciones.
 *
 * Esta clase no toca el DOM ni el router a propósito: así se puede probar
 * entera sin navegador.
 */
export class CoordinadorScroll {
  private scrollsEnCurso = 0;
  private escriturasEnCurso = 0;

  /**
   * Cambia con cada reinicio, y los cierres recuerdan en cuál nacieron.
   *
   * Sin esto, un `scrollend` de la ficha anterior llegaba después de cambiar de
   * proyecto y restaba de una cuenta que ya no era la suya, soltando un
   * desplazamiento de la ficha nueva que sí estaba en marcha. Lo encontró su
   * propio test, no la revisión.
   */
  private generacion = 0;

  /**
   * Empieza un desplazamiento que provoca el propio código.
   *
   * Devuelve la función que lo da por terminado. Se cuentan en vez de usar un
   * booleano porque pueden solaparse: pulsar dos secciones seguidas abre el
   * segundo desplazamiento antes de que el primero acabe, y cerrar el primero
   * no debe dejar vía libre mientras el segundo sigue en marcha.
   */
  iniciarDesplazamiento(): () => void {
    this.scrollsEnCurso++;
    return this.cierre(
      () => { this.scrollsEnCurso = Math.max(0, this.scrollsEnCurso - 1); });
  }

  /** Empieza una escritura del fragmento en la URL hecha por el código. */
  iniciarEscrituraDeUrl(): () => void {
    this.escriturasEnCurso++;
    return this.cierre(
      () => { this.escriturasEnCurso = Math.max(0, this.escriturasEnCurso - 1); });
  }

  /**
   * Envuelve un cierre para que solo cuente una vez y solo en su generacion.
   *
   * Idempotente porque el componente cierra por `scrollend` y tambien por el
   * temporizador de respaldo, y los dos pueden llegar. Atado a la generacion
   * porque un cierre tardio no debe restar de una cuenta que ya se reinicio.
   */
  private cierre(descontar: () => void): () => void {
    const miGeneracion = this.generacion;
    let cerrado = false;
    return () => {
      if (cerrado || miGeneracion !== this.generacion) return;
      cerrado = true;
      descontar();
    };
  }

  /**
   * ¿Puede el scroll del usuario escribir el fragmento en la URL?
   *
   * No, mientras estemos desplazando nosotros: esa sería la realimentación.
   */
  puedeEscribirUrl(): boolean {
    return this.scrollsEnCurso === 0;
  }

  /**
   * ¿Hay que atender este cambio de fragmento desplazando la vista?
   *
   * No, si el cambio lo acabamos de escribir nosotros: la vista ya está donde
   * tiene que estar y desplazarla otra vez la haría saltar.
   */
  debeAtenderFragmento(): boolean {
    return this.escriturasEnCurso === 0;
  }

  /** Cancela todo lo que hubiera en curso. Para cuando se cambia de proyecto. */
  reiniciar(): void {
    this.generacion++;
    this.scrollsEnCurso = 0;
    this.escriturasEnCurso = 0;
  }
}
