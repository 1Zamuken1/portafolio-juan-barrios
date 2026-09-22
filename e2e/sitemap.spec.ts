import { test, expect } from '@playwright/test';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * El sitemap tiene que listar exactamente las páginas que el build genera.
 *
 * Se escribía a mano, y olvidar una página no rompe nada visible: existe y
 * funciona, sencillamente los buscadores no se enteran de que está ahí. Ahora
 * lo genera `scripts/sitemap.mjs`, pero eso solo mueve el olvido de sitio —
 * ahora se puede olvidar regenerarlo.
 *
 * **La comparación es contra el HTML prerenderizado, no contra los datos.** El
 * generador repite la regla del prerender (`status !== 'Draft'`), así que son
 * dos sitios que pueden desincronizarse. Comprobar el sitemap contra los mismos
 * datos de los que sale solo demostraría que el script es consistente consigo
 * mismo; compararlo con lo que el build produce sí detecta que las dos reglas
 * se han separado.
 */
const RAIZ = join(__dirname, '..');
const DIST = join(RAIZ, 'dist', 'portafolio-juan-barrios', 'browser');
const SITIO = 'https://portafolio-juan-barrios.vercel.app';

/** Las rutas que el build ha prerenderizado, por sus index.html. */
function rutasPrerenderizadas(): string[] {
  const rutas: string[] = [];

  const recorrer = (dir: string): void => {
    for (const entrada of readdirSync(dir)) {
      const ruta = join(dir, entrada);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (entrada === 'index.html') {
        const relativa = relative(DIST, ruta).replace(/\\/g, '/').replace(/index\.html$/, '');
        rutas.push('/' + relativa.replace(/\/$/, ''));
      }
    }
  };

  recorrer(DIST);
  return rutas.sort();
}

/** Las urls del sitemap, como rutas relativas al sitio. */
function rutasDelSitemap(): string[] {
  const xml = readFileSync(join(RAIZ, 'public', 'sitemap.xml'), 'utf-8');
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1].replace(SITIO, '') || '/')
    .sort();
}

test.describe('sitemap', () => {

  test('es un XML con la estructura que esperan los buscadores', () => {
    const xml = readFileSync(join(RAIZ, 'public', 'sitemap.xml'), 'utf-8');
    expect(xml.startsWith('<?xml')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml.match(/<url>/g)?.length).toBe(xml.match(/<\/url>/g)?.length);
  });

  test('todas las fechas son validas y ninguna esta en el futuro', () => {
    const xml = readFileSync(join(RAIZ, 'public', 'sitemap.xml'), 'utf-8');
    const fechas = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((m) => m[1]);

    expect(fechas.length).toBeGreaterThan(0);
    for (const f of fechas) {
      expect(f, `${f} no tiene el formato AAAA-MM-DD`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(f).getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  test('el panel de administracion no aparece', () => {
    // Se renderiza en cliente, esta detras de login y robots.txt lo excluye.
    // Listarlo en el sitemap seria invitar a indexarlo.
    const xml = readFileSync(join(RAIZ, 'public', 'sitemap.xml'), 'utf-8');
    expect(xml).not.toContain('/admin');
  });

  test('robots.txt apunta al sitemap y excluye el panel', () => {
    const robots = readFileSync(join(RAIZ, 'public', 'robots.txt'), 'utf-8');
    expect(robots).toContain(`Sitemap: ${SITIO}/sitemap.xml`);
    expect(robots).toContain('Disallow: /admin');
  });

  test('lista exactamente las paginas que genera el build', () => {
    test.skip(!existsSync(DIST), 'no hay build: ejecuta pnpm run build');

    const generadas = rutasPrerenderizadas();
    const listadas = rutasDelSitemap();

    const sinListar = generadas.filter((r) => !listadas.includes(r));
    const deMas = listadas.filter((r) => !generadas.includes(r));

    expect(sinListar,
      'Estas paginas existen pero no estan en el sitemap, asi que los\n' +
      'buscadores no las encontraran. Regenera con:\n' +
      '  node scripts/sitemap.mjs\n\n' + sinListar.join('\n')).toEqual([]);

    expect(deMas,
      'El sitemap lista paginas que el build no genera. Un 404 en el sitemap\n' +
      'resta credibilidad al resto.\n\n' + deMas.join('\n')).toEqual([]);
  });
});
