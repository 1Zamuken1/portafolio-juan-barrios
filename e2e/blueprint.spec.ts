import { test, expect } from '@playwright/test';
import projects from '../src/assets/data/projects.json';

/**
 * Los casos se derivan del propio projects.json para que los ids no vuelvan a
 * desincronizarse cuando se reordenen o agreguen proyectos.
 */
const cases = (projects as Array<{
  id: number;
  name: string;
  status: string;
  architectureNodes?: unknown[];
}>)
  .filter((p) => p.status !== 'Draft' && (p.architectureNodes?.length ?? 0) > 0)
  .map((p) => ({
    id: p.id,
    name: p.name,
    path: `/projects/${p.id}`,
    expectedNodes: p.architectureNodes!.length,
  }));

test.describe('Blueprint viewer renders on case-study pages', () => {
  test('hay proyectos con arquitectura para validar', () => {
    expect(cases.length).toBeGreaterThan(0);
  });

  for (const c of cases) {
    test(`${c.name} blueprint viewer renders`, async ({ page }) => {
      await page.goto(c.path, { waitUntil: 'networkidle' });

      const bw = page.locator('.blueprint-viewer');
      await expect(bw).toBeVisible();

      // Cada nodo del JSON debe tener su contraparte renderizada.
      const nodes = page.locator('.svg-node');
      await expect(nodes).toHaveCount(c.expectedNodes);

      const svg = page.locator('.blueprint-viewer svg');
      await expect(svg).toBeVisible();
      expect(await svg.boundingBox()).not.toBeNull();

      // El encuadre inicial debe dejar TODOS los nodos dentro del viewport.
      // Regresion historica: sin viewBox y con initialZoom fijo se perdia
      // cerca del 40% del diagrama por la derecha.
      const fuera = await page.evaluate(() => {
        const vp = document.querySelector('.blueprint-viewport');
        if (!vp) return -1;
        const r = vp.getBoundingClientRect();
        return [...document.querySelectorAll('.svg-node')].filter((n) => {
          const b = n.getBoundingClientRect();
          return b.left < r.left - 1 || b.right > r.right + 1 || b.top < r.top - 1 || b.bottom > r.bottom + 1;
        }).length;
      });
      expect(fuera).toBe(0);

      // Ninguna ruta puede atravesar una tarjeta, ni nacer/morir dentro de una.
      // Regresion historica: las aristas con puerto "auto" se anclaban al
      // centro del nodo, y el trazado no esquivaba los nodos intermedios.
      const solapes = await page.evaluate(() => {
        const puntos = (d: string) => {
          const out: Array<{ x: number; y: number }> = [];
          const re = /([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(d))) out.push({ x: +m[2], y: +m[3] });
          return out;
        };
        const cajas = [...document.querySelectorAll('.svg-node')].map((g) => {
          const m = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(g.getAttribute('transform') || '')!;
          const r = g.querySelector('rect')!;
          return { x: +m[1], y: +m[2], w: +r.getAttribute('width')!, h: +r.getAttribute('height')! };
        });
        const dentro = (p: { x: number; y: number }, r: any) =>
          p.x > r.x + 2 && p.x < r.x + r.w - 2 && p.y > r.y + 2 && p.y < r.y + r.h - 2;
        const corta = (a: any, b: any, r: any) => {
          const L = r.x + 2, R = r.x + r.w - 2, T = r.y + 2, B = r.y + r.h - 2;
          if (Math.abs(a.y - b.y) < 0.01) {
            if (a.y <= T || a.y >= B) return false;
            return Math.max(Math.min(a.x, b.x), L) < Math.min(Math.max(a.x, b.x), R);
          }
          if (Math.abs(a.x - b.x) < 0.01) {
            if (a.x <= L || a.x >= R) return false;
            return Math.max(Math.min(a.y, b.y), T) < Math.min(Math.max(a.y, b.y), B);
          }
          return false;
        };

        let cruces = 0;
        let extremosDentro = 0;
        for (const el of document.querySelectorAll('.connector-line')) {
          const P = puntos(el.getAttribute('d') || '');
          if (!P.length) continue;
          const ini = P[0], fin = P[P.length - 1];
          for (const r of cajas) {
            if (dentro(ini, r)) extremosDentro++;
            if (dentro(fin, r)) extremosDentro++;
            // El nodo de origen/destino no cuenta como obstaculo.
            if (dentro(ini, r) || dentro(fin, r)) continue;
            for (let k = 0; k < P.length - 1; k++) {
              if (corta(P[k], P[k + 1], r)) { cruces++; break; }
            }
          }
        }
        return { cruces, extremosDentro };
      });
      expect(solapes.extremosDentro).toBe(0);
      expect(solapes.cruces).toBe(0);

      // Dos rutas distintas no pueden compartir carril: se dibujarian una
      // encima de la otra. Se nota sobre todo en diagramas con muchos nodos.
      const carriles = await page.evaluate(() => {
        const puntos = (d: string) => {
          const out: Array<{ x: number; y: number }> = [];
          const re = /([ML])\s*(-?[\d.]+)\s+(-?[\d.]+)/g;
          let m: RegExpExecArray | null;
          while ((m = re.exec(d))) out.push({ x: +m[2], y: +m[3] });
          return out;
        };
        type Seg = { ruta: number; eje: string; c: number; min: number; max: number };
        const segs: Seg[] = [];
        [...document.querySelectorAll('.connector-line')].forEach((el, i) => {
          const P = puntos(el.getAttribute('d') || '');
          for (let k = 0; k < P.length - 1; k++) {
            const a = P[k], b = P[k + 1];
            if (Math.abs(a.y - b.y) < 0.01) {
              segs.push({ ruta: i, eje: 'h', c: a.y, min: Math.min(a.x, b.x), max: Math.max(a.x, b.x) });
            } else if (Math.abs(a.x - b.x) < 0.01) {
              segs.push({ ruta: i, eje: 'v', c: a.x, min: Math.min(a.y, b.y), max: Math.max(a.y, b.y) });
            }
          }
        });
        let solapes = 0;
        for (let i = 0; i < segs.length; i++) {
          for (let j = i + 1; j < segs.length; j++) {
            const A = segs[i], B = segs[j];
            if (A.ruta === B.ruta || A.eje !== B.eje || Math.abs(A.c - B.c) > 0.5) continue;
            if (Math.min(A.max, B.max) - Math.max(A.min, B.min) > 1) solapes++;
          }
        }
        return solapes;
      });
      expect(carriles).toBe(0);

      // Ningun conector puede quedar con un path degenerado.
      const paths = await page.locator('.connector-line').evaluateAll((els) =>
        els.map((e) => e.getAttribute('d') || '')
      );
      expect(paths.length).toBeGreaterThan(0);
      for (const d of paths) {
        const nums = d.match(/-?\d+(\.\d+)?/g)?.map(Number) || [];
        expect(nums.length).toBeGreaterThanOrEqual(4);
        expect(nums.every((n) => Number.isFinite(n))).toBe(true);
      }
    });
  }
});
