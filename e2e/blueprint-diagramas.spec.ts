import { test, expect } from '@playwright/test';
import projects from '../src/assets/data/projects.json';
import {
  colocarNodos,
  trazarConectores,
  ExtendedBlueprintNode
} from '../src/app/shared/components/blueprint-viewer/services/blueprint-router';
import { BlueprintEdge, BlueprintNode } from '../src/app/shared/models/blueprint.model';

/**
 * El router del visor sobre diagramas enteros.
 *
 * blueprint-router.spec prueba las piezas (una ruta, un puerto, un reparto de
 * carriles). Esto prueba lo que las orquesta: que en un diagrama real cada
 * conector salga y llegue al borde de su caja, no atraviese otra, no comparta
 * puerto con otro conector y siga siendo ortogonal despues del reparto.
 *
 * Se ejecuta sobre los diagramas publicados y sobre uno con la forma que da
 * MaquetadorDeDiagrama a lo que propone la IA, que es el que no revisa nadie
 * a mano antes de publicarse.
 */

type Punto = { x: number; y: number };
type Diagrama = { nombre: string; nodes: BlueprintNode[]; edges: BlueprintEdge[] };

const publicados: Diagrama[] = (projects as Array<{ slug: string; architectureNodes?: BlueprintNode[]; architectureEdges?: BlueprintEdge[] }>)
  .filter((p) => p.architectureNodes?.length)
  .map((p) => ({ nombre: p.slug, nodes: p.architectureNodes!, edges: p.architectureEdges ?? [] }));

/** Como lo coloca MaquetadorDeDiagrama: columnas de 380 px, cajas de 250 x 96,
 *  cada caja a la altura de sus vecinas. Es el primer diagrama de GastuApp. */
const caja = (id: string, group: string, x: number, y: number): BlueprintNode =>
  ({ id, label: id, group, x, y, width: 250, height: 96 });
const deLaIa: Diagrama = {
  nombre: 'maquetado por la IA',
  nodes: [
    caja('client', 'client', 80, 240), caja('api', 'application', 460, 240),
    caja('orm', 'persistence', 840, 80), caja('google', 'external', 840, 240),
    caja('gemini', 'external', 840, 400), caja('db', 'database', 1220, 80)
  ],
  edges: [
    { from: 'client', to: 'api', fromPort: 'right', toPort: 'left', routeType: 'orthogonal' },
    { from: 'api', to: 'orm', fromPort: 'right', toPort: 'left', routeType: 'orthogonal' },
    { from: 'orm', to: 'db', fromPort: 'right', toPort: 'left', routeType: 'orthogonal' },
    { from: 'api', to: 'google', fromPort: 'right', toPort: 'left', routeType: 'orthogonal' },
    { from: 'api', to: 'gemini', fromPort: 'right', toPort: 'left', routeType: 'orthogonal' }
  ]
};

const todos = [...publicados, deLaIa];

function puntos(d: string): Punto[] {
  return [...d.matchAll(/[ML]\s+(-?[\d.]+)\s+(-?[\d.]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }));
}

/** Sobre el borde de la caja (y no dentro ni fuera de ella). */
function enElBorde(p: Punto, n: ExtendedBlueprintNode): boolean {
  const dentroX = p.x >= n.x - 0.5 && p.x <= n.x + n.width + 0.5;
  const dentroY = p.y >= n.y - 0.5 && p.y <= n.y + n.height + 0.5;
  const enX = Math.abs(p.x - n.x) < 0.5 || Math.abs(p.x - (n.x + n.width)) < 0.5;
  const enY = Math.abs(p.y - n.y) < 0.5 || Math.abs(p.y - (n.y + n.height)) < 0.5;
  return (enX && dentroY) || (enY && dentroX);
}

/** Un tramo que entra en la caja, con 2 de holgura como el propio router. */
function cruza(a: Punto, b: Punto, n: ExtendedBlueprintNode): boolean {
  const izq = n.x + 2, der = n.x + n.width - 2, arr = n.y + 2, aba = n.y + n.height - 2;
  return Math.min(a.x, b.x) < der && Math.max(a.x, b.x) > izq &&
         Math.min(a.y, b.y) < aba && Math.max(a.y, b.y) > arr;
}

for (const d of todos) {
  test.describe(`diagrama: ${d.nombre}`, () => {
    const nodos = colocarNodos(d.nodes, d.edges);
    const porId = new Map(nodos.map((n) => [n.id, n]));
    const conectores = trazarConectores(d.edges, nodos);
    const automaticas = d.edges.filter((e) => !e.bendPoints?.length && (e.routeType ?? 'orthogonal') === 'orthogonal');
    const esAutomatico = (id: string) => automaticas.some((e) => `${e.from}→${e.to}` === id);

    test('hay un conector por arista, y ninguno roto', () => {
      expect(conectores).toHaveLength(d.edges.length);
      for (const c of conectores) {
        expect(c.path, c.id).not.toContain('NaN');
        expect(puntos(c.path).length, c.id).toBeGreaterThanOrEqual(2);
      }
    });

    test('cada conector automatico sale y llega al borde de su caja', () => {
      for (const c of conectores.filter((x) => esAutomatico(x.id))) {
        const p = puntos(c.path);
        expect(enElBorde(p[0], porId.get(c.from)!), `${c.id} no sale del borde`).toBe(true);
        expect(enElBorde(p.at(-1)!, porId.get(c.to)!), `${c.id} no llega al borde`).toBe(true);
      }
    });

    test('los conectores automaticos son ortogonales, tambien tras el reparto', () => {
      for (const c of conectores.filter((x) => esAutomatico(x.id))) {
        const p = puntos(c.path);
        for (let i = 0; i < p.length - 1; i++) {
          const recto = Math.abs(p[i].x - p[i + 1].x) < 0.001 || Math.abs(p[i].y - p[i + 1].y) < 0.001;
          expect(recto, `${c.id}: tramo diagonal`).toBe(true);
        }
      }
    });

    test('ningun conector automatico atraviesa una caja que no es suya', () => {
      const cruces: string[] = [];
      for (const c of conectores.filter((x) => esAutomatico(x.id))) {
        const p = puntos(c.path);
        for (const n of nodos) {
          if (n.id === c.from || n.id === c.to) continue;
          for (let i = 0; i < p.length - 1; i++) {
            if (cruza(p[i], p[i + 1], n)) { cruces.push(`${c.id} cruza ${n.id}`); break; }
          }
        }
      }
      expect(cruces).toEqual([]);
    });

    test('dos conectores no comparten el mismo punto de anclaje', () => {
      const vistos = new Map<string, string>();
      const repetidos: string[] = [];
      for (const c of conectores.filter((x) => esAutomatico(x.id))) {
        const p = puntos(c.path);
        for (const [nodo, q] of [[c.from, p[0]], [c.to, p.at(-1)!]] as Array<[string, Punto]>) {
          const clave = `${nodo}@${Math.round(q.x)},${Math.round(q.y)}`;
          if (vistos.has(clave)) repetidos.push(`${c.id} y ${vistos.get(clave)} en ${clave}`);
          else vistos.set(clave, c.id);
        }
      }
      expect(repetidos).toEqual([]);
    });
  });
}

test('una arista a un nodo que no existe se ignora en vez de romper el diagrama', () => {
  const nodos = colocarNodos(deLaIa.nodes, deLaIa.edges);
  const conectores = trazarConectores([...deLaIa.edges, { from: 'api', to: 'fantasma' }], nodos);
  expect(conectores).toHaveLength(deLaIa.edges.length);
});

test('dos aristas entre el mismo par de nodos no se dibujan una encima de otra', () => {
  const nodos = colocarNodos(deLaIa.nodes, deLaIa.edges);
  const ida: BlueprintEdge = { from: 'client', to: 'api', fromPort: 'right', toPort: 'left' };
  const [a, b] = trazarConectores([ida, { ...ida }], nodos);
  expect(a.path).not.toBe(b.path);
});

test('los puertos de un lado siguen el orden de lo que conectan, y no se cruzan', () => {
  // api reparte a tres cajas de la columna siguiente, de arriba abajo. Sus
  // tres salidas tienen que ir en ese mismo orden: si no, dos lineas se
  // cruzan nada mas salir.
  const nodos = colocarNodos(deLaIa.nodes, deLaIa.edges);
  const conectores = trazarConectores(deLaIa.edges, nodos);
  const salida = (a: string) => puntos(conectores.find((c) => c.id === `api→${a}`)!.path)[0].y;
  expect(salida('orm')).toBeLessThan(salida('google'));
  expect(salida('google')).toBeLessThan(salida('gemini'));
});
