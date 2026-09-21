import { test, expect } from '@playwright/test';
import projects from '../src/assets/data/projects.json';

/**
 * Cada ruta debe publicar sus propios metadatos. Antes las seis compartian
 * el titulo y la descripcion del index.html, asi que los cuatro casos de
 * estudio competian entre si y se veian identicos al compartirlos.
 */
const publicados = (projects as Array<{ id: number; name: string; status: string }>)
  .filter((p) => p.status !== 'Draft');

const rutas = [
  { path: '/', tituloContiene: 'Juan Esteban Barrios', jsonLd: 'Person' },
  { path: '/about', tituloContiene: 'Sobre mí', jsonLd: null },
  ...publicados.map((p) => ({
    path: `/projects/${p.id}`,
    tituloContiene: p.name,
    jsonLd: 'SoftwareSourceCode'
  }))
];

test.describe('SEO por ruta', () => {
  const titulosVistos = new Map<string, string>();

  for (const r of rutas) {
    test(`${r.path} publica sus propios metadatos`, async ({ page }) => {
      await page.goto(r.path, { waitUntil: 'networkidle' });

      const titulo = await page.title();
      expect(titulo).toContain(r.tituloContiene);

      // Ningun titulo puede repetirse entre rutas.
      expect(titulosVistos.has(titulo), `titulo duplicado con ${titulosVistos.get(titulo)}`).toBe(false);
      titulosVistos.set(titulo, r.path);

      const desc = await page.locator('meta[name="description"]').getAttribute('content');
      expect(desc?.length ?? 0).toBeGreaterThan(30);

      const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
      expect(canonical).toContain(r.path === '/' ? '/' : r.path);

      for (const prop of ['og:title', 'og:description', 'og:url', 'og:image']) {
        const v = await page.locator(`meta[property="${prop}"]`).getAttribute('content');
        expect(v, `falta ${prop}`).toBeTruthy();
      }
      expect(await page.locator('meta[name="twitter:card"]').getAttribute('content')).toBe('summary_large_image');

      if (r.jsonLd) {
        const ld = await page.locator('#seo-json-ld').textContent();
        expect(JSON.parse(ld || '{}')['@type']).toBe(r.jsonLd);
      }
    });
  }

  test('la portada tiene un unico h1', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('h1')).toHaveCount(1);
  });

  test('los encabezados no arrastran las almohadillas de markdown', async ({ page }) => {
    await page.goto(`/projects/${publicados[0].id}`, { waitUntil: 'networkidle' });
    const conMarcas = await page.locator('h1, h2, h3').evaluateAll((els) =>
      els.filter((e) => /^\s*#/.test(e.textContent || '')).length
    );
    expect(conMarcas).toBe(0);
  });
});
