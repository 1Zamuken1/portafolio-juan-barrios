import { test, expect } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import projects from '../src/assets/data/projects.json';

/**
 * La ficha ofrece el despliegue si existe y, si no, la descarga. Nunca las dos.
 *
 * No son lo mismo con distinto nombre: uno abre una página y el otro baja un
 * instalador de varios cientos de megas. Si el botón dijera "Live Demo" y
 * empezara una descarga, mentiría sobre lo que va a pasar al pulsarlo.
 *
 * Se comprueba sobre el HTML prerenderizado porque es lo que existe sin
 * JavaScript, y porque así el test no depende de levantar la aplicación.
 */
const DIST = join(__dirname, '..', 'dist', 'portafolio-juan-barrios', 'browser');

type Proyecto = {
  id: number;
  slug: string;
  status: string;
  links?: { github?: string; live?: string | null; download?: string | null };
};

const publicados = (projects as Proyecto[]).filter((p) => p.status !== 'Draft');

test.describe('enlaces de la ficha', () => {
  test.skip(!existsSync(DIST), 'no hay build: ejecuta pnpm run build');

  for (const p of publicados) {
    test(`${p.slug} ofrece el enlace que le corresponde`, () => {
      const html = readFileSync(join(DIST, `projects/${p.id}/index.html`), 'utf-8');

      const tieneLive = Boolean(p.links?.live);
      const tieneDescarga = Boolean(p.links?.download);

      expect(html.includes('Live Demo'), `${p.slug}: boton de despliegue`).toBe(tieneLive);

      // La descarga solo aparece cuando NO hay despliegue, aunque el dato este.
      expect(html.includes('Download'), `${p.slug}: boton de descarga`)
        .toBe(!tieneLive && tieneDescarga);

      if (tieneLive) expect(html).toContain(p.links!.live!);
      if (!tieneLive && tieneDescarga) expect(html).toContain(p.links!.download!);
    });
  }

  test('al menos un proyecto usa cada rama, o el test no prueba nada', () => {
    // Sin esto, el bucle de arriba pasaria igual si todos los proyectos
    // cayeran del mismo lado y la rama nueva no se ejecutara nunca.
    expect(publicados.some((p) => p.links?.live), 'ninguno tiene despliegue').toBeTruthy();
    expect(
      publicados.some((p) => !p.links?.live && p.links?.download),
      'ninguno cae en la rama de descarga'
    ).toBeTruthy();
  });

  test('una descarga de GitHub apunta a la ultima release, no a una version fija', () => {
    // Un enlace al .exe de una version concreta deja de ser la ultima en
    // cuanto publicas otra, y no hay nada que avise: el boton sigue
    // funcionando y ofreciendo software viejo.
    for (const p of publicados) {
      const url = p.links?.download;
      if (!url || !url.includes('github.com')) continue;
      expect(url, `${p.slug}: usa /releases/latest en vez de un .exe con version`)
        .toContain('/releases/latest');
    }
  });
});
