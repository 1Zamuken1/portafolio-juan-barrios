import { test, expect } from '@playwright/test';
import {
  BlueprintPathCalculator,
  ObstacleRect
} from '../src/app/shared/components/blueprint-viewer/services/blueprint-path-calculator';
import { BlueprintPositioningService } from '../src/app/shared/components/blueprint-viewer/services/blueprint-positioning.service';
import { ComputedNodeLayout } from '../src/app/shared/models/blueprint.model';

/**
 * El router del visor de arquitectura: cómo decide por dónde va cada conector.
 *
 * Hasta ahora solo lo cubrían tests end-to-end, que abren un navegador, pintan
 * el diagrama y miran el resultado. Eso comprueba que **el dibujo final** no
 * tiene solapamientos, pero no las reglas que lo producen: por qué gira aquí,
 * por qué rodea ese nodo, qué pasa cuando ninguna ruta queda limpia.
 *
 * Existía `services/blueprint-path-calculator.spec.ts` para esto, pero
 * `ng test` no tiene target en `angular.json`, así que nunca llegó a
 * ejecutarse. Se nota: esperaba `C 150 50 350 300` para una curva cuyo valor
 * real es `C 200 50 300 300`. Habría fallado el primer día. Sus casos están
 * recogidos aquí, con los números corregidos, y el fichero muerto se retira.
 *
 * **Se comprueba la geometría, no el texto del atributo `d`.** La versión
 * anterior hacía `expect(path).toContain('L 250 50')`, que se rompe con un
 * espacio de más y no dice nada sobre si la línea pasa por donde debe. Aquí
 * las rutas se parsean a puntos y se comprueba el trazado.
 */

type Punto = { x: number; y: number };

/** Convierte un atributo `d` ortogonal en la lista de vértices. */
function puntosDe(d: string): Punto[] {
  return [...d.matchAll(/[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)/g)]
    .map((m) => ({ x: Number(m[1]), y: Number(m[2]) }));
}

/** Los tramos consecutivos de una ruta. */
function tramos(puntos: Punto[]): Array<[Punto, Punto]> {
  const salida: Array<[Punto, Punto]> = [];
  for (let i = 0; i < puntos.length - 1; i++) salida.push([puntos[i], puntos[i + 1]]);
  return salida;
}

/**
 * ¿Algún tramo entra en el rectángulo?
 *
 * Se escribe aquí a propósito, de forma independiente, en vez de reutilizar el
 * `segmentHitsRect` del servicio: comprobar el código con su propia lógica solo
 * demuestra que es consistente consigo mismo. Este usa margen cero, así que es
 * algo más estricto que el original, que se deja 2 unidades de tolerancia.
 */
function atraviesa(puntos: Punto[], r: ObstacleRect): boolean {
  const der = r.x + r.width;
  const aba = r.y + r.height;

  return tramos(puntos).some(([a, b]) => {
    const minX = Math.min(a.x, b.x), maxX = Math.max(a.x, b.x);
    const minY = Math.min(a.y, b.y), maxY = Math.max(a.y, b.y);
    // Solapamiento estricto: tocar el borde no cuenta como atravesar.
    return minX < der && maxX > r.x && minY < aba && maxY > r.y;
  });
}

const calc = () => new BlueprintPathCalculator();

test.describe('router del blueprint', () => {

  test.describe('trazados basicos', () => {

    test('la linea recta une los dos puntos y nada mas', () => {
      expect(calc().buildStraightPath({ x: 100, y: 50 }, { x: 400, y: 300 }))
        .toBe('M 100 50 L 400 300');
    });

    test('la curva saca los puntos de control en la direccion de cada puerto', () => {
      // distX 300 -> controlDist min(100, 100) = 100.
      // Saliendo por la derecha el control se adelanta; entrando por la
      // izquierda, se retrasa. Asi la curva sale y entra perpendicular al borde.
      expect(calc().buildCurvedPath({ x: 100, y: 50 }, { x: 400, y: 300 }, 'right', 'left'))
        .toBe('M 100 50 C 200 50 300 300 400 300');
    });

    test('una lista de puntos vacia no produce una ruta invalida', () => {
      expect(calc().buildPathFromPoints([])).toBe('');
    });

    test('calculatePath despacha segun el tipo de ruta', () => {
      const c = calc();
      const a = { x: 0, y: 0 }, b = { x: 100, y: 100 };
      expect(c.calculatePath(a, b, 'right', 'left', 'straight')).toBe(c.buildStraightPath(a, b));
      expect(c.calculatePath(a, b, 'right', 'left', 'curved')).toBe(c.buildCurvedPath(a, b, 'right', 'left'));
      expect(c.calculatePath(a, b, 'right', 'left', 'orthogonal')).toBe(c.buildOrthogonalPath(a, b, 'right', 'left'));
    });
  });

  test.describe('rutas ortogonales', () => {

    test('entre lados horizontales gira a mitad de camino', () => {
      const p = puntosDe(calc().buildOrthogonalPath({ x: 100, y: 50 }, { x: 400, y: 90 }, 'right', 'left'));

      expect(p[0]).toEqual({ x: 100, y: 50 });
      expect(p.at(-1)).toEqual({ x: 400, y: 90 });
      // El giro esta a medio camino en X, y ambos vertices intermedios lo comparten.
      expect(p[1].x).toBe(250);
      expect(p[2].x).toBe(250);
    });

    test('el desplazamiento de carril mueve el giro, no los extremos', () => {
      const c = calc();
      const sinOffset = puntosDe(c.buildOrthogonalPath({ x: 100, y: 50 }, { x: 400, y: 90 }, 'right', 'left', 0));
      const conOffset = puntosDe(c.buildOrthogonalPath({ x: 100, y: 50 }, { x: 400, y: 90 }, 'right', 'left', 12));

      expect(conOffset[1].x - sinOffset[1].x).toBe(12);
      // Los extremos estan anclados a los puertos: no se mueven nunca.
      expect(conOffset[0]).toEqual(sinOffset[0]);
      expect(conOffset.at(-1)).toEqual(sinOffset.at(-1));
    });

    test('entre lados verticales gira a mitad de camino en el otro eje', () => {
      const p = puntosDe(calc().buildOrthogonalPath({ x: 100, y: 50 }, { x: 160, y: 250 }, 'bottom', 'top'));

      expect(p[1].y).toBe(150);
      expect(p[2].y).toBe(150);
    });

    test('con lados mixtos traza una L, girando primero en el eje del puerto de salida', () => {
      // Saliendo por la derecha, el primer tramo tiene que ser horizontal: si
      // girara antes, la linea se despegaria del borde del nodo.
      const desdeLado = puntosDe(calc().buildOrthogonalPath({ x: 100, y: 50 }, { x: 400, y: 300 }, 'right', 'top'));
      expect(desdeLado).toHaveLength(3);
      expect(desdeLado[1]).toEqual({ x: 400, y: 50 });

      // Saliendo por abajo, al reves.
      const desdeAbajo = puntosDe(calc().buildOrthogonalPath({ x: 100, y: 50 }, { x: 400, y: 300 }, 'bottom', 'left'));
      expect(desdeAbajo[1]).toEqual({ x: 100, y: 300 });
    });
  });

  test.describe('esquivar nodos', () => {

    /** Un nodo justo en medio del camino directo entre (100,50) y (500,50). */
    const enMedio: ObstacleRect = { x: 220, y: 10, width: 120, height: 90 };

    test('sin obstaculos usa la ruta directa', () => {
      const c = calc();
      const conLista = c.buildOrthogonalPath({ x: 100, y: 50 }, { x: 500, y: 50 }, 'right', 'left', 0, []);
      const sinLista = c.buildOrthogonalPath({ x: 100, y: 50 }, { x: 500, y: 50 }, 'right', 'left', 0);
      expect(conLista).toBe(sinLista);
    });

    test('la ruta directa atravesaria el nodo, y por eso hace falta esquivar', () => {
      // Sin esta comprobacion el test siguiente pasaria aunque el codigo no
      // esquivara nada: bastaria con que el obstaculo no estorbara.
      const directa = puntosDe(
        calc().buildOrthogonalPath({ x: 100, y: 50 }, { x: 500, y: 50 }, 'right', 'left'));
      expect(atraviesa(directa, enMedio)).toBe(true);
    });

    test('con el nodo en medio devuelve una ruta que no lo atraviesa', () => {
      const esquivada = puntosDe(
        calc().buildOrthogonalPath({ x: 100, y: 50 }, { x: 500, y: 50 }, 'right', 'left', 0, [enMedio]));

      expect(atraviesa(esquivada, enMedio), 'la ruta sigue cruzando el nodo').toBe(false);
      // Y sigue empezando y acabando en sus puertos.
      expect(esquivada[0]).toEqual({ x: 100, y: 50 });
      expect(esquivada.at(-1)).toEqual({ x: 500, y: 50 });
    });

    test('esquiva tambien en vertical', () => {
      const obstaculo: ObstacleRect = { x: 60, y: 120, width: 140, height: 80 };
      const p = puntosDe(
        calc().buildOrthogonalPath({ x: 120, y: 50 }, { x: 140, y: 300 }, 'bottom', 'top', 0, [obstaculo]));

      expect(atraviesa(p, obstaculo)).toBe(false);
    });

    test('si ninguna alternativa queda limpia devuelve una ruta valida igualmente', () => {
      // Un muro que cubre todo el ancho: no hay por donde pasar. El visor tiene
      // que dibujar algo de todas formas; quedarse sin conector seria peor que
      // uno que cruza.
      const muro: ObstacleRect = { x: -5000, y: 10, width: 10000, height: 90 };
      const d = calc().buildOrthogonalPath({ x: 100, y: 50 }, { x: 500, y: 50 }, 'right', 'left', 0, [muro]);
      const p = puntosDe(d);

      expect(p.length).toBeGreaterThanOrEqual(2);
      expect(p[0]).toEqual({ x: 100, y: 50 });
      expect(p.at(-1)).toEqual({ x: 500, y: 50 });
      expect(d).not.toContain('NaN');
    });

    test('calculateRoutePoints devuelve los mismos vertices que la ruta serializada', () => {
      const c = calc();
      const puntos = c.calculateRoutePoints({ x: 100, y: 50 }, { x: 500, y: 50 }, 'right', 'left', 0, [enMedio]);
      const serializada = puntosDe(
        c.buildOrthogonalPath({ x: 100, y: 50 }, { x: 500, y: 50 }, 'right', 'left', 0, [enMedio]));

      expect(puntos).toEqual(serializada);
    });
  });

  test.describe('reparto en carriles', () => {

    /**
     * Dos rutas que recorren el mismo corredor horizontal a y=100.
     *
     * La forma importa: los vecinos del tramo compartido son verticales. Es
     * como salen las rutas reales, y es lo que permite desplazar ese tramo sin
     * que el conector deje de ser ortogonal. Una primera version de este test
     * usaba cuatro puntos a la misma altura, que no es una forma que el router
     * produzca, y al moverla aparecian diagonales.
     */
    const dosRutasIguales = (): Punto[][] => ([
      [{ x: 0, y: 50 }, { x: 50, y: 50 }, { x: 50, y: 100 },
       { x: 250, y: 100 }, { x: 250, y: 150 }, { x: 300, y: 150 }],
      [{ x: 0, y: 50 }, { x: 50, y: 50 }, { x: 50, y: 100 },
       { x: 250, y: 100 }, { x: 250, y: 150 }, { x: 300, y: 150 }]
    ]);

    /** Todos los tramos son horizontales o verticales, ninguno diagonal. */
    function esOrtogonal(puntos: Punto[]): boolean {
      return tramos(puntos).every(([a, b]) =>
        Math.abs(a.x - b.x) < 0.001 || Math.abs(a.y - b.y) < 0.001);
    }

    test('dos rutas que comparten corredor dejan de solaparse', () => {
      const rutas = dosRutasIguales();
      calc().separateChannels(rutas, [[], []]);

      // El tramo compartido, el de y=100, ya no esta a la misma altura.
      expect(rutas[0][2].y).not.toBe(rutas[1][2].y);
      // Y el tramo sigue siendo recto: sus dos extremos comparten altura.
      expect(rutas[1][2].y).toBe(rutas[1][3].y);
    });

    test('las rutas siguen siendo ortogonales despues de repartirlas', () => {
      // Mover un tramo sin mover sus vecinos generaria diagonales, y el visor
      // dibuja planos: una linea en diagonal se ve como un error de trazado.
      const rutas = dosRutasIguales();
      calc().separateChannels(rutas, [[], []]);

      for (const ruta of rutas) {
        expect(esOrtogonal(ruta), 'aparecio un tramo diagonal').toBe(true);
      }
    });

    test('los tramos anclados a los puertos no se mueven', () => {
      // El primero y el ultimo salen del borde del nodo. Desplazarlos dejaria
      // el conector flotando al lado de la tarjeta en vez de tocandola.
      const rutas = dosRutasIguales();
      const antes = JSON.parse(JSON.stringify(rutas));
      calc().separateChannels(rutas, [[], []]);

      for (const i of [0, 1]) {
        expect(rutas[i][0], 'se movio el punto de salida').toEqual(antes[i][0]);
        expect(rutas[i].at(-1), 'se movio el punto de llegada').toEqual(antes[i].at(-1));
      }
    });

    test('no se desplaza un carril a un sitio ocupado por una tarjeta', () => {
      const rutas = dosRutasIguales();
      // Una tarjeta ocupando el carril contiguo por debajo. El corredor de al
      // lado esta ocupado, asi que el reparto tiene que seguir buscando en vez
      // de meter la linea dentro de la tarjeta.
      const estorbo: ObstacleRect[] = [{ x: 60, y: 108, width: 180, height: 20 }];
      calc().separateChannels(rutas, [estorbo, estorbo]);

      for (const ruta of rutas) {
        // Solo se comprueba el tramo compartido: los verticales de los extremos
        // estan anclados y pueden rozar la tarjeta sin que sea culpa del reparto.
        const compartido = [ruta[2], ruta[3]];
        expect(atraviesa(compartido, estorbo[0]), 'el carril acabo dentro de la tarjeta').toBe(false);
      }
    });

    test('una ruta demasiado corta para tener tramos interiores se deja intacta', () => {
      const cortas: Array<Punto[] | null> = [
        [{ x: 0, y: 0 }, { x: 10, y: 0 }],
        null
      ];
      const antes = JSON.stringify(cortas[0]);
      calc().separateChannels(cortas, [[], []]);
      expect(JSON.stringify(cortas[0])).toBe(antes);
    });
  });
});

/**
 * Dónde se ancla cada conector en el borde del nodo.
 *
 * Los extremos van siempre al borde, nunca al centro: una línea que naciera en
 * el centro se vería atravesando su propia tarjeta. Y cuando varias conexiones
 * comparten lado hay que repartirlas, o se apilan en el mismo punto.
 */
test.describe('puertos del blueprint', () => {

  const nodo = (extra: Partial<ComputedNodeLayout> = {}): ComputedNodeLayout => ({
    nodeId: 'n', x: 100, y: 200, width: 250, height: 96,
    centerX: 225, centerY: 248,
    ports: { top: [], bottom: [], left: [], right: [] },
    ...extra
  });

  const pos = () => new BlueprintPositioningService();

  test('una sola conexion se ancla al centro del lado', () => {
    const n = nodo();
    expect(pos().portPosition(n, 'top', 0, 1)).toEqual({ x: 225, y: 200 });
    expect(pos().portPosition(n, 'bottom', 0, 1)).toEqual({ x: 225, y: 296 });
    expect(pos().portPosition(n, 'left', 0, 1)).toEqual({ x: 100, y: 248 });
    expect(pos().portPosition(n, 'right', 0, 1)).toEqual({ x: 350, y: 248 });
  });

  test('varias conexiones en el mismo lado se reparten sin salirse', () => {
    const n = nodo();
    const p = pos();
    const tres = [0, 1, 2].map((i) => p.portPosition(n, 'top', i, 3));

    // El margen de 12 unidades impide que el primero y el ultimo caigan
    // justo en la esquina, donde la linea se confundiria con el borde.
    expect(tres[0].x).toBe(112);
    expect(tres[2].x).toBe(338);
    // Repartidos de verdad, no apilados.
    expect(tres[1].x).toBe(225);
    // Y todos sobre el borde superior.
    expect(tres.every((q) => q.y === 200)).toBe(true);
  });

  test('el lado se elige por la posicion relativa de los dos nodos', () => {
    const p = pos();
    const origen = nodo({ centerX: 100, centerY: 100 });

    // Mas separacion horizontal que vertical: sale por el costado.
    const aLaDerecha = nodo({ centerX: 500, centerY: 120 });
    expect(p.autoDetectPort(origen, aLaDerecha, true)).toBe('right');
    // Y entra por el lado opuesto, o la flecha llegaria por detras.
    expect(p.autoDetectPort(origen, aLaDerecha, false)).toBe('left');

    // Mas separacion vertical: sale por abajo y entra por arriba.
    const debajo = nodo({ centerX: 120, centerY: 500 });
    expect(p.autoDetectPort(origen, debajo, true)).toBe('bottom');
    expect(p.autoDetectPort(origen, debajo, false)).toBe('top');

    // Hacia atras y hacia arriba.
    const arribaIzquierda = nodo({ centerX: 100, centerY: -400 });
    expect(p.autoDetectPort(origen, arribaIzquierda, true)).toBe('top');
    expect(p.autoDetectPort(origen, arribaIzquierda, false)).toBe('bottom');
  });
});
