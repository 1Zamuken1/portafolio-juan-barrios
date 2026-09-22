import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * La aplicación es zoneless y no debe volver a cargar Zone.js.
 *
 * Las dos mitades se configuran en sitios distintos —el modo en `main.ts`, el
 * polyfill en `angular.json`— así que es fácil que dejen de coincidir sin que
 * nada falle. Eso es justo lo que pasó: `provideZonelessChangeDetection()`
 * convivió con `polyfills: ["zone.js"]` durante meses. Angular avisaba en cada
 * arranque con NG0914, pero es un warning entre el ruido del build y nadie lo
 * leyó. Costaba 36 kB de descarga inicial y parchear todas las APIs asíncronas
 * del navegador para nada.
 *
 * Un aviso que se ignora no protege. Esto sí falla.
 */
const RAIZ = join(__dirname, '..');

const leer = (...partes: string[]) => readFileSync(join(RAIZ, ...partes), 'utf-8');

test.describe('zoneless', () => {

  test('la aplicacion arranca en modo zoneless', () => {
    expect(leer('src', 'app', 'app.config.ts')).toContain('provideZonelessChangeDetection');
  });

  test('zone.js no esta en los polyfills del build', () => {
    const angularJson = JSON.parse(leer('angular.json'));
    const proyecto = Object.values(angularJson.projects)[0] as {
      architect: { build: { options: { polyfills?: string[] } } };
    };
    const polyfills = proyecto.architect.build.options.polyfills ?? [];

    expect(polyfills,
      'La aplicacion es zoneless: cargar zone.js son 36 kB y un parcheo de todas ' +
      'las APIs asincronas que nadie usa. Angular solo avisa con NG0914, que se ' +
      'pierde entre el ruido del build.').not.toContain('zone.js');
  });

  test('zone.js tampoco esta entre las dependencias', () => {
    // Es peer opcional de @angular/core, asi que no hace falta tenerlo. Si
    // vuelve, es que alguien intento reactivarlo.
    const pkg = JSON.parse(leer('package.json'));
    expect(Object.keys(pkg.dependencies ?? {})).not.toContain('zone.js');
    expect(Object.keys(pkg.devDependencies ?? {})).not.toContain('zone.js');
  });

  test('el bundle servido no incluye un fichero de polyfills', () => {
    // La comprobacion de verdad: que no llegue al navegador. Las de arriba
    // miran la configuracion; esta mira el resultado.
    const indice = leer('dist', 'portafolio-juan-barrios', 'browser', 'index.html');
    expect(indice).not.toMatch(/polyfills[-.][A-Za-z0-9]+\.js/);
  });
});
