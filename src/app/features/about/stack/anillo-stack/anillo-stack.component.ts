import {
  Component,
  ElementRef,
  OnDestroy,
  PLATFORM_ID,
  afterNextRender,
  computed,
  inject,
  input,
  signal,
  viewChild,
  viewChildren
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { AdminSkill } from '../../../../shared/models/skill.model';

/**
 * El stack como un anillo que gira, en vez de como una lista.
 *
 * <p>Sale del componente que ocupaba toda la pagina de «about» antes de que
 * esta se partiera en tres documentos. De aquello solo se salva el anillo: el
 * resto eran textos escritos a mano que ya viven en profile.md y en
 * trayectoria.md, contadores fijos que llevaban meses sin cuadrar con los datos
 * ("20+ Tecnologias", "5 Proyectos") e iconos de Font Awesome, que este
 * portafolio dejo de cargar.
 *
 * <p><b>No recibe datos, los recibe ya cargados.</b> El anillo y la lista pintan
 * exactamente lo mismo: si cada uno fuera a buscarlo por su cuenta podrian
 * acabar enseniando cosas distintas.
 *
 * <p><b>La lista sigue siendo lo principal</b>, y esto es un extra que hay que
 * pedir. Un anillo que se arrastra con el raton no se puede recorrer con el
 * teclado ni leer con un lector de pantalla, y ademas es lo que se prerenderiza
 * y lo que lee un buscador. Ponerlo por defecto habria cambiado una pagina que
 * se lee por una que se mira.
 */
@Component({
  selector: 'app-anillo-stack',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './anillo-stack.component.html',
  styleUrl: './anillo-stack.component.css'
})
export class AnilloStackComponent implements OnDestroy {
  /** Las mismas que pinta la lista, en el mismo orden. */
  skills = input.required<AdminSkill[]>();

  private anillo = viewChild<ElementRef<HTMLElement>>('anillo');
  private planetas = viewChildren<ElementRef<HTMLElement>>('planeta');

  /** Repartidas por la circunferencia. */
  protected conAngulo = computed(() => {
    const lista = this.skills();
    return lista.map((skill, i) => ({ skill, angulo: (360 / lista.length) * i }));
  });

  /** La que tiene el puntero encima, y que se muestra en el centro. */
  protected activa = signal<AdminSkill | null>(null);

  private raf?: number;
  private rotacion = 0;
  private velocidad = 0;
  private arrastrando = false;
  private xAnterior = 0;
  private deltaFotograma = 0;

  /** Cuanto gira sola por fotograma, en grados. */
  private static readonly GIRO_AUTOMATICO = 0.08;
  /** Cuanto pierde por fotograma al soltar. Por debajo de 1 acaba parando. */
  private static readonly ROZAMIENTO = 0.96;

  private automatico = true;

  constructor() {
    const esNavegador = isPlatformBrowser(inject(PLATFORM_ID));

    // afterNextRender y no ngOnInit: el bucle toca el DOM directamente y
    // durante el prerender no hay ni DOM ni requestAnimationFrame.
    afterNextRender(() => {
      if (!esNavegador) return;

      // Quien ha pedido que no se muevan las cosas no quiere un anillo girando
      // solo. Se puede seguir arrastrando: eso lo mueve quien mira.
      this.automatico = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.bucle();
    });
  }

  ngOnDestroy(): void {
    if (this.raf !== undefined) cancelAnimationFrame(this.raf);
  }

  /**
   * Un unico bucle para las tres cosas que mueven el anillo.
   *
   * Arrastrar, la inercia al soltar y el giro solo son estados de lo mismo y no
   * tres animaciones a la vez; con bucles separados se pisarian y el anillo
   * daria tirones al cambiar de uno a otro.
   *
   * Escribe el transform directamente sobre el elemento y no pasa por ninguna
   * senial: sesenta veces por segundo, cualquier cosa que dispare deteccion de
   * cambios sale cara para algo que solo mueve pixeles.
   */
  private bucle = (): void => {
    if (this.arrastrando) {
      this.rotacion += this.deltaFotograma;
      this.velocidad = this.deltaFotograma;
      this.deltaFotograma = 0;
    } else if (Math.abs(this.velocidad) > 0.02) {
      this.rotacion += this.velocidad;
      this.velocidad *= AnilloStackComponent.ROZAMIENTO;
    } else if (!this.activa() && this.automatico) {
      // Con el puntero sobre una tecnologia se para: si no, lo que se esta
      // leyendo en el centro se va antes de terminar de leerlo.
      this.velocidad = 0;
      this.rotacion += AnilloStackComponent.GIRO_AUTOMATICO;
    }

    this.rotacion %= 360;
    this.pintar();
    this.raf = requestAnimationFrame(this.bucle);
  };

  private pintar(): void {
    const anillo = this.anillo();
    if (!anillo) return;

    anillo.nativeElement.style.transform = `rotateX(72deg) rotateZ(${this.rotacion}deg)`;

    // Cada tecnologia deshace el giro del anillo y su inclinacion, para quedar
    // de frente. Sin esto se leerian tumbadas y del reves en media vuelta.
    const items = this.conAngulo();
    this.planetas().forEach((planeta, i) => {
      if (i >= items.length) return;
      planeta.nativeElement.style.transform =
        `rotateZ(${-items[i].angulo - this.rotacion}deg) rotateX(-72deg)`;
    });
  }

  protected entrar(skill: AdminSkill): void {
    this.activa.set(skill);
    this.velocidad = 0;
  }

  protected salir(): void {
    this.activa.set(null);
  }

  protected empezarArrastre(evento: MouseEvent | TouchEvent): void {
    this.arrastrando = true;
    this.velocidad = 0;
    this.deltaFotograma = 0;
    this.xAnterior = this.x(evento);
  }

  protected moverArrastre(evento: MouseEvent | TouchEvent): void {
    if (!this.arrastrando) return;
    const x = this.x(evento);
    // Se acumula y lo consume el bucle, en vez de girar aqui mismo: el raton
    // manda mas eventos que fotogramas hay, y aplicarlos todos hace que el
    // anillo se adelante al dedo.
    this.deltaFotograma -= (x - this.xAnterior) * 0.5;
    this.xAnterior = x;
  }

  protected terminarArrastre(): void {
    this.arrastrando = false;
  }

  private x(evento: MouseEvent | TouchEvent): number {
    return 'touches' in evento ? evento.touches[0].clientX : evento.clientX;
  }
}
