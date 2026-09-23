import { DestroyRef, Directive, ElementRef, afterNextRender, inject, input } from '@angular/core';
import { NgControl } from '@angular/forms';

/** Si el navegador sabe hacer crecer un textarea con su contenido solo. */
const CRECE_SOLO = typeof CSS !== 'undefined' && CSS.supports?.('field-sizing', 'content');

/**
 * Hace que un {@code pTextarea} crezca con su texto.
 *
 * <p>Los textos de la ficha --un objetivo, una arquitectura, la descripcion de
 * un desafio-- ocupan cuatro o cinco lineas, y en cajas de tres filas se leian
 * cortados por la mitad. Donde el navegador lo sabe hacer, lo hace el CSS
 * ({@code field-sizing: content} en styles/admin-primeng.css) y esta
 * directiva no hace nada. Donde no, mide a mano.
 *
 * <p>No se usa el {@code autoResize} de PrimeNG: mide una vez al montar y al
 * escribir, y la ficha se rellena con el paso 2 oculto. Un textarea oculto
 * mide cero, asi que se quedaba plano al aparecer. Aqui se vuelve a medir
 * cuando cambia de ancho, que incluye pasar de oculto a visible.
 *
 * <p>{@code filas} es el alto minimo, en lineas.
 */
@Directive({
  selector: 'textarea[appCrecerConTexto]',
  standalone: true,
  host: { '[style.--filas]': 'filas()' }
})
export class CrecerConTextoDirective {
  filas = input(2, { alias: 'appCrecerConTexto', transform: (v: unknown) => Number(v) || 2 });

  private el = inject<ElementRef<HTMLTextAreaElement>>(ElementRef).nativeElement;
  private control = inject(NgControl, { optional: true, self: true });

  constructor() {
    if (CRECE_SOLO) return;

    const destroyRef = inject(DestroyRef);
    afterNextRender(() => {
      const medir = () => this.medir();
      this.el.addEventListener('input', medir);
      const cambios = this.control?.valueChanges?.subscribe(() => requestAnimationFrame(medir));
      const observador = new ResizeObserver(medir);
      observador.observe(this.el);
      medir();

      destroyRef.onDestroy(() => {
        this.el.removeEventListener('input', medir);
        cambios?.unsubscribe();
        observador.disconnect();
      });
    });
  }

  private medir(): void {
    if (!this.el.offsetParent) return;
    this.el.style.height = 'auto';
    this.el.style.height = `${this.el.scrollHeight}px`;
  }
}
