import { test, expect } from '@playwright/test';
import { CoordinadorScroll } from '../src/app/features/projects/coordinador-scroll';

/**
 * La coordinación entre el scroll y la URL en la ficha de un proyecto.
 *
 * Dos flujos que se pisan: pulsar una sección cambia la URL y eso desplaza la
 * vista; hacer scroll a mano detecta la sección y eso escribe la URL. Sin
 * coordinación se realimentan y la vista se queda en una sección que nadie
 * pidió.
 *
 * Antes eran dos banderas limpiadas por temporizador —1000 ms y 50 ms—, dos
 * suposiciones sobre cuánto tarda un scroll suave y cuánto tarda el router. El
 * documento de estado lo llamaba «el punto más frágil del frontend». Aquí la
 * decisión vive en una clase sin DOM ni router, y por eso se puede probar.
 */
test.describe('coordinador de scroll', () => {

  test('en reposo, los dos sentidos estan permitidos', () => {
    const c = new CoordinadorScroll();
    expect(c.puedeEscribirUrl()).toBe(true);
    expect(c.debeAtenderFragmento()).toBe(true);
  });

  test('mientras desplazamos nosotros, el scroll no escribe la URL', () => {
    // Es la realimentacion que rompia la navegacion: la animacion pasa por
    // secciones intermedias y cada una reescribia el fragmento.
    const c = new CoordinadorScroll();
    const terminar = c.iniciarDesplazamiento();

    expect(c.puedeEscribirUrl()).toBe(false);

    terminar();
    expect(c.puedeEscribirUrl()).toBe(true);
  });

  test('mientras escribimos la URL, el fragmento no vuelve a desplazar', () => {
    const c = new CoordinadorScroll();
    const terminar = c.iniciarEscrituraDeUrl();

    expect(c.debeAtenderFragmento()).toBe(false);

    terminar();
    expect(c.debeAtenderFragmento()).toBe(true);
  });

  test('los dos sentidos son independientes', () => {
    // Desplazar no debe impedir atender un fragmento nuevo: pulsar otra
    // seccion a media animacion tiene que funcionar.
    const c = new CoordinadorScroll();
    c.iniciarDesplazamiento();

    expect(c.puedeEscribirUrl()).toBe(false);
    expect(c.debeAtenderFragmento()).toBe(true);
  });

  test('dos desplazamientos solapados no se desbloquean a medias', () => {
    // Pulsar dos secciones seguidas abre el segundo antes de cerrar el
    // primero. Con un booleano, cerrar el primero daba via libre mientras la
    // segunda animacion seguia en marcha, que es exactamente el fallo que
    // producia el temporizador de 1000 ms al vencer antes de tiempo.
    const c = new CoordinadorScroll();
    const primero = c.iniciarDesplazamiento();
    const segundo = c.iniciarDesplazamiento();

    primero();
    expect(c.puedeEscribirUrl(), 'se solto con un desplazamiento aun en curso').toBe(false);

    segundo();
    expect(c.puedeEscribirUrl()).toBe(true);
  });

  test('cerrar dos veces no descuadra la cuenta', () => {
    // El componente cierra por `scrollend` y tambien por el temporizador de
    // respaldo. Los dos pueden llegar, y el segundo no debe restar de mas.
    const c = new CoordinadorScroll();
    const primero = c.iniciarDesplazamiento();
    const segundo = c.iniciarDesplazamiento();

    primero();
    primero();
    primero();

    expect(c.puedeEscribirUrl(), 'un cierre repetido solto el que quedaba').toBe(false);
    segundo();
    expect(c.puedeEscribirUrl()).toBe(true);
  });

  test('reiniciar cancela todo lo que hubiera en curso', () => {
    // Al cambiar de proyecto el componente se reutiliza. Si algo quedara
    // abierto, la ficha nueva no actualizaria nunca la URL al hacer scroll.
    const c = new CoordinadorScroll();
    c.iniciarDesplazamiento();
    c.iniciarEscrituraDeUrl();

    c.reiniciar();

    expect(c.puedeEscribirUrl()).toBe(true);
    expect(c.debeAtenderFragmento()).toBe(true);
  });

  test('cerrar algo de antes de un reinicio no abre un agujero', () => {
    // El `scrollend` de la ficha anterior puede llegar despues de reiniciar.
    // Si restara, dejaria la cuenta en negativo y soltaria un desplazamiento
    // de la ficha nueva que si esta en curso.
    const c = new CoordinadorScroll();
    const viejo = c.iniciarDesplazamiento();
    c.reiniciar();

    c.iniciarDesplazamiento();
    viejo();

    expect(c.puedeEscribirUrl(), 'un cierre tardio solto el desplazamiento actual').toBe(false);
  });
});
