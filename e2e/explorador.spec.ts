import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Cada "fichero" del explorador tiene que llevar a algún sitio.
 *
 * El explorador imita un árbol de proyecto: pulsar `timeline.json` o
 * `tech-stack.yml` deberÍa abrir esa sección. Los dos enlazaban a
 * `/about#experience` y `/about#stack`, pero la página no tenía **ni un solo
 * `id`**, así que ambos dejaban al visitante arriba del todo. Peor aún:
 * `timeline.json` apuntaba a una sección que no existía — el componente
 * cargaba y ordenaba las experiencias y la plantilla no las usaba nunca.
 *
 * No fallaba nada. La URL cambiaba, la pestaña se abría con el nombre
 * correcto, y la página se quedaba quieta. Solo se nota si lo pulsas y
 * esperas algo.
 */
const RAIZ = join(__dirname, '..');

const leer = (...p: string[]) => readFileSync(join(RAIZ, 'src', 'app', ...p), 'utf-8');

/** Los ids que declara una plantilla. */
function anclajes(html: string): Set<string> {
  return new Set([...html.matchAll(/\sid="([a-zA-Z0-9_-]+)"/g)].map((m) => m[1]));
}

/** Los enlaces del explorador, como pares ruta + fragmento. */
function enlacesDelExplorador(): Array<{ ruta: string; fragmento: string; linea: number }> {
  const html = leer('layout', 'vscode-layout', 'vscode-layout.component.html');
  const salida: Array<{ ruta: string; fragmento: string; linea: number }> = [];

  // Por etiqueta y no por linea: algunos enlaces reparten sus atributos en
  // varias lineas y un parseo por linea se los saltaba en silencio, que es
  // justo el tipo de fallo que este fichero existe para evitar.
  for (const etiqueta of html.matchAll(/<a\b[^>]*>/gs)) {
    const texto = etiqueta[0];
    // Las fichas de proyecto usan la forma enlazada, [routerLink]="[...]",
    // porque el id sale de un bucle. Mirar solo el atributo literal dejaba
    // fuera seis de los ocho enlaces sin que se notara.
    const ruta = /\brouterLink="([^"]+)"/.exec(texto)?.[1]
      ?? (/\[routerLink\]="\[\s*'([^']+)'/.exec(texto)?.[1]);
    const fragmento = /\bfragment="([^"]+)"/.exec(texto)?.[1];
    if (!ruta || !fragmento) continue;
    salida.push({
      ruta,
      fragmento,
      linea: html.slice(0, etiqueta.index).split('\n').length
    });
  }
  return salida;
}

test.describe('explorador', () => {

  test('se leen enlaces con fragmento', () => {
    // Si el parseo devolviera cero, el test de abajo pasaria sin comprobar nada.
    expect(enlacesDelExplorador().length).toBeGreaterThanOrEqual(6);
  });

  test('cada fichero del explorador apunta a una seccion que existe', () => {
    const porRuta: Record<string, Set<string>> = {
      '/about': anclajes(leer('features', 'about', 'about.component.html')),
      '/projects': anclajes(leer('features', 'projects', 'projects.component.html'))
    };

    const rotos = enlacesDelExplorador()
      .filter(({ ruta, fragmento }) => {
        // Las fichas de proyecto comparten plantilla, sea cual sea el id.
        const clave = ruta.startsWith('/projects') ? '/projects' : ruta;
        const ids = porRuta[clave];
        return ids && !ids.has(fragmento);
      })
      .map(({ ruta, fragmento, linea }) =>
        `vscode-layout.component.html:${linea} -> ${ruta}#${fragmento}`);

    expect(rotos,
      'Estos enlaces del explorador no tienen una seccion a la que saltar.\n' +
      'No dan error: cambian la URL, abren la pestana y dejan la pagina\n' +
      'quieta, que es peor que un enlace roto porque no se nota.\n\n' +
      rotos.join('\n')).toEqual([]);
  });

  test('la experiencia que carga el componente llega a dibujarse', () => {
    // Estuvo cargada y ordenada, sin usarse, todo el tiempo que existio la
    // carpeta `experience` en el explorador. Ahora vive en su propio
    // documento, y la comprobacion se mueve con ella.
    const ts = leer('features', 'about', 'trayectoria', 'trayectoria.component.ts');
    const html = leer('features', 'about', 'trayectoria', 'trayectoria.component.html');

    expect(ts, 'el documento ya no carga las experiencias').toContain('getStaticExperiences');
    expect(html, 'se cargan las experiencias pero la plantilla no las usa')
      .toContain('entradas()');
  });

  test('cada enlace del explorador apunta a una ruta declarada', () => {
    // Los documentos del perfil son rutas propias, no anclas. Un routerLink
    // con una ruta que no existe no falla al compilar: lleva al comodin **,
    // que redirige a la portada. El visitante pulsa un fichero y aterriza en
    // el inicio sin saber por que.
    const rutas = leer('app.routes.ts');
    const declaradas = new Set(
      [...rutas.matchAll(/path:\s*'([^']*)'/g)].map((m) => '/' + m[1]).filter((r) => r !== '/**'));

    const html = leer('layout', 'vscode-layout', 'vscode-layout.component.html');
    const enlaces = [...html.matchAll(/<a[^>]*>/gs)]
      .map((e) => /routerLink="([^"]+)"/.exec(e[0])?.[1])
      .filter((r): r is string => !!r && r !== '/');

    const rotos = enlaces.filter((r) => !declaradas.has(r));
    expect(rotos,
      'Estos enlaces del explorador no corresponden a ninguna ruta declarada.\n' +
      'No fallan al compilar: caen en el comodin ** y redirigen a la portada,\n' +
      'asi que el visitante pulsa un fichero y aterriza en el inicio.\n\n' +
      rotos.join('\n')).toEqual([]);
  });
});
