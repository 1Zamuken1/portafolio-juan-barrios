import {
  AfterViewInit, Directive, ElementRef, OnDestroy, ViewChild, inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, NavigationEnd, Router } from '@angular/router';
import { Subscription, filter, startWith } from 'rxjs';

/**
 * Lo común a los tres documentos del perfil: `profile`, `trayectoria` y `stack`.
 *
 * Los tres se dibujan con la misma estructura de documento —una hoja con su
 * cuerpo desplazable— y los tres tienen que atender el fragmento de la URL.
 * Eso último no es trivial y se resolvió una vez; heredarlo evita repetir el
 * mecanismo en tres sitios y que se desincronicen.
 */
@Directive()
export abstract class DocumentoBase implements AfterViewInit, OnDestroy {
  protected route = inject(ActivatedRoute);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('cuerpo') cuerpo?: ElementRef<HTMLElement>;
  private fragmentoSub?: Subscription;

  /**
   * Lleva la vista a la sección que pide el fragmento de la URL.
   *
   * Se escuchan los eventos del router y no `route.fragment`. Medido: al
   * navegar dentro de la misma ruta el componente no se recrea y
   * `route.fragment` no llega a emitir, así que el salto no ocurría. Entrando
   * directamente por URL sí funcionaba, y eso hacía el fallo desconcertante.
   * `NavigationEnd` dispara en los dos casos.
   */
  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    this.fragmentoSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), startWith(null))
      .subscribe(() => {
        const fragmento = this.route.snapshot.fragment;
        if (fragmento) this.esperarYSaltar(fragmento);
      });
  }

  /**
   * Espera a que la sección exista y a que el documento deje de crecer.
   *
   * Un retardo fijo no vale: las secciones se dibujan con datos que llegan por
   * suscripción, así que a veces estaban y a veces no. Se reintenta hasta que
   * la altura se repite, que es la señal de que ya está todo pintado.
   */
  private esperarYSaltar(fragmento: string, intento = 0, alturaPrevia = -1): void {
    const cuerpo = this.cuerpo?.nativeElement;
    const destino = document.getElementById(fragmento);
    const altura = cuerpo?.scrollHeight ?? 0;

    if (cuerpo && destino && altura === alturaPrevia) {
      // La posición se calcula contra el contenedor que se desplaza y no con
      // offsetTop: el offsetParent de las secciones es un ancestro distinto.
      const posicion = destino.getBoundingClientRect().top
        - cuerpo.getBoundingClientRect().top
        + cuerpo.scrollTop;
      cuerpo.scrollTo({ top: Math.max(0, posicion - 16), behavior: 'smooth' });
      return;
    }

    if (intento >= 20) return;
    setTimeout(() => this.esperarYSaltar(fragmento, intento + 1, altura), 50);
  }

  ngOnDestroy(): void {
    this.fragmentoSub?.unsubscribe();
  }
}
