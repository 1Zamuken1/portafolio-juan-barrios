#!/usr/bin/env node
/**
 * Genera public/sitemap.xml a partir de los datos.
 *
 *   node scripts/sitemap.mjs
 *   pnpm run sitemap
 *
 * Estaba escrito a mano, con las fechas congeladas en el dia que se creo.
 * Anadir un proyecto obligaba a acordarse, y olvidarlo no rompe nada visible:
 * la pagina existe y funciona, sencillamente los buscadores no se enteran de
 * que esta ahi.
 *
 * MISMA REGLA QUE EL PRERENDER. `app.routes.server.ts` decide que paginas se
 * generan filtrando los proyectos por `status !== 'Draft'`. Aqui se repite esa
 * regla, asi que son dos sitios que pueden desincronizarse; por eso
 * `e2e/sitemap.spec.ts` compara el sitemap con el HTML que el build produce de
 * verdad y falla si no coinciden exactamente.
 *
 * LAS FECHAS salen del ultimo commit que toco los ficheros de datos, no del
 * dia en que se ejecuta esto. Si fuera la fecha de hoy, cada regeneracion
 * ensuciaria el diff con un cambio que no significa nada.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITIO = 'https://portafolio-juan-barrios.vercel.app';
const DATOS = join(RAIZ, 'src', 'assets', 'data');

/** Fecha del ultimo commit que toco alguno de los ficheros de datos. */
function fechaDeLosDatos() {
  const ficheros = ['projects.json', 'experiences.json', 'skills.json']
    .map((f) => join('src', 'assets', 'data', f));

  const fechas = ficheros.map((f) => {
    try {
      return execFileSync('git', ['log', '-1', '--format=%cs', '--', f],
        { cwd: RAIZ, encoding: 'utf-8' }).trim();
    } catch {
      return '';
    }
  }).filter(Boolean);

  // Sin git (un tarball descargado, por ejemplo) se cae a la fecha de hoy.
  return fechas.sort().at(-1) ?? new Date().toISOString().slice(0, 10);
}

const proyectos = JSON.parse(readFileSync(join(DATOS, 'projects.json'), 'utf-8'));
const publicados = proyectos.filter((p) => p.status !== 'Draft');
const fecha = fechaDeLosDatos();

/**
 * Las prioridades no las lee Google desde hace anos, pero las conserva Bing y
 * algun otro. Se mantienen las que ya habia: las fichas por encima del indice,
 * porque son el contenido, y el indice existe sobre todo para llegar a ellas.
 */
const paginas = [
  { ruta: '/', prioridad: '1.0' },
  { ruta: '/about', prioridad: '0.8' },
  { ruta: '/about/trayectoria', prioridad: '0.8' },
  { ruta: '/about/stack', prioridad: '0.7' },
  { ruta: '/projects', prioridad: '0.7' },
  ...publicados.map((p) => ({ ruta: `/projects/${p.id}`, prioridad: '0.9' }))
];

const xml = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<!-- GENERADO POR scripts/sitemap.mjs - NO EDITAR A MANO -->',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...paginas.flatMap(({ ruta, prioridad }) => [
    '  <url>',
    `    <loc>${SITIO}${ruta}</loc>`,
    `    <lastmod>${fecha}</lastmod>`,
    `    <priority>${prioridad}</priority>`,
    '  </url>'
  ]),
  '</urlset>',
  ''
].join('\n');

writeFileSync(join(RAIZ, 'public', 'sitemap.xml'), xml, 'utf-8');

console.log(`\nsitemap.xml con ${paginas.length} urls, fecha ${fecha}`);
for (const { ruta } of paginas) console.log(`  ${ruta}`);

const borradores = proyectos.length - publicados.length;
if (borradores) {
  console.log(`\n  ${borradores} proyecto(s) en borrador, fuera del sitemap y del prerender.`);
}
