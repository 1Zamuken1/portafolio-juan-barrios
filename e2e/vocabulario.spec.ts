import { test, expect } from '@playwright/test';
import projects from '../src/assets/data/projects.json';
import vocabulario from '../src/assets/data/vocabulario.json';

/**
 * Que los datos hablen el vocabulario de src/assets/data/vocabulario.json.
 *
 * Es lo que se normalizo para que el redactor pudiera generar estos campos:
 * si una ficha hecha a mano vuelve a meter "Architecture" o "Export Formats",
 * el desorden regresa y el modelo lo aprenderia de los ejemplos.
 */

type Ficha = {
  slug: string;
  structuredStack?: Record<string, string[]>;
  structuredFeatures?: Record<string, string[]>;
  rawMetrics?: Record<string, unknown>;
};
const fichas = projects as Ficha[];

const capas = new Set(vocabulario.stack.map((c) => c.clave));
const sinonimosGrupo = new Map(vocabulario.caracteristicas.flatMap((c) =>
  c.sinonimos.map((s) => [s.toLowerCase(), c.titulo] as const)));

for (const f of fichas) {
  test(`${f.slug}: el stack solo usa capas del vocabulario`, () => {
    for (const clave of Object.keys(f.structuredStack ?? {})) {
      expect(capas.has(clave), `capa "${clave}"`).toBe(true);
    }
  });

  test(`${f.slug}: los grupos de caracteristicas comunes van con su nombre`, () => {
    for (const grupo of Object.keys(f.structuredFeatures ?? {})) {
      const canonico = sinonimosGrupo.get(grupo.toLowerCase());
      expect(canonico, `"${grupo}" es un sinonimo: usa "${canonico}"`).toBeUndefined();
      expect(grupo[0], `"${grupo}" empieza en minuscula`).toBe(grupo[0].toUpperCase());
    }
  });

  test(`${f.slug}: las metricas no repiten lo que ya dice la cabecera`, () => {
    for (const clave of Object.keys(f.rawMetrics ?? {})) {
      expect(vocabulario.metricasRepetidas).not.toContain(clave.toLowerCase());
    }
  });
}
