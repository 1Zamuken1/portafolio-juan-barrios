import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import projects from '../src/assets/data/projects.json';

/**
 * Comprueba el HTML generado por `pnpm run build`, no la aplicacion viva.
 * Es lo que ven los rastreadores que no ejecutan JavaScript: LinkedIn,
 * WhatsApp, Slack o Facebook al generar la vista previa de un enlace.
 *
 * Se omite si no hay build: `pnpm run build` antes de ejecutarlo.
 */
const DIST = join(__dirname, '..', 'dist', 'portafolio-juan-barrios', 'browser');

const paginas = [
  { archivo: 'index.html', titulo: 'Juan Esteban Barrios', jsonLd: 'Person' },
  { archivo: 'about/index.html', titulo: 'Sobre mí', jsonLd: null },
  ...(projects as Array<{ id: number; name: string; status: string }>)
    .filter((p) => p.status !== 'Draft')
    .map((p) => ({
      archivo: `projects/${p.id}/index.html`,
      titulo: p.name,
      jsonLd: 'SoftwareSourceCode'
    }))
];

test.describe('HTML prerenderizado', () => {
  test.skip(!existsSync(DIST), 'no hay build: ejecuta pnpm run build');

  for (const p of paginas) {
    test(`${p.archivo} se genera con sus metadatos`, () => {
      const ruta = join(DIST, p.archivo);
      expect(existsSync(ruta), `falta ${p.archivo}`).toBe(true);

      const html = readFileSync(ruta, 'utf-8');

      const titulo = /<title>(.*?)<\/title>/s.exec(html)?.[1] ?? '';
      expect(titulo).toContain(p.titulo);

      for (const attr of ['name="description"', 'property="og:title"', 'property="og:image"', 'property="og:url"']) {
        expect(html, `falta ${attr} en ${p.archivo}`).toContain(attr);
      }
      expect(html).toContain('rel="canonical"');

      if (p.jsonLd) {
        expect(html).toContain('application/ld+json');
        expect(html).toContain(`"@type":"${p.jsonLd}"`);
      }
    });
  }

  test('el contenido se sirve sin JavaScript', () => {
    const html = readFileSync(join(DIST, 'projects/1/index.html'), 'utf-8');
    // El diagrama y los encabezados existen ya en el HTML estatico.
    expect(html).toContain('<h1');
    expect((html.match(/svg-node/g) || []).length).toBeGreaterThan(0);
  });

  test('cada proyecto anuncia su propia imagen al compartirse', () => {
    const vistas = new Set<string>();
    for (const p of (projects as Array<{ id: number; status: string }>).filter((x) => x.status !== 'Draft')) {
      const html = readFileSync(join(DIST, `projects/${p.id}/index.html`), 'utf-8');
      const img = /property="og:image" content="(.*?)"/.exec(html)?.[1] ?? '';
      expect(img).toBeTruthy();
      vistas.add(img);
    }
    // Ninguna se repite: cada caso de estudio tiene su propia portada.
    expect(vistas.size).toBe(4);
  });
});
