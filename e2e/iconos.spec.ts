import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Cada icono del portafolio tiene que existir de verdad en devicon.
 *
 * Un nombre de clase inventado no falla: no dibuja nada. Queda un hueco en la
 * ficha del proyecto y no hay error en consola, asi que solo se descubre
 * mirando la pagina con atencion. Ya paso dos veces --`devicon-uml-plain`, que
 * se arreglo a mano, y `devicon-angular-original`, que llevaba tiempo sin
 * dibujarse-- y por eso esto se comprueba en vez de confiar en la vista.
 *
 * La lista buena no se escribe aqui: se saca de `devicon.json`, que viene en el
 * propio paquete instalado. Asi vale para las 578 tecnologias que trae y se
 * actualiza sola al subir la version de devicon.
 *
 * Esto importa mas ahora que hay un redactor con IA: un modelo no puede
 * adivinar estas clases, solo acertarlas por casualidad. Por eso no las genera
 * --el borrador es solo prosa-- y por eso el dia que se generen tendran que
 * resolverse contra esta misma lista.
 */

type EntradaDevicon = {
  name: string;
  versions: { font?: string[] };
  aliases?: { base: string; alias: string }[];
};

const RAIZ = join(__dirname, '..');

/** Las clases de fuente que devicon sabe dibujar. */
function clasesValidas(): Set<string> {
  const manifiesto: EntradaDevicon[] = JSON.parse(
    readFileSync(join(RAIZ, 'node_modules', 'devicon', 'devicon.json'), 'utf-8'));

  const validas = new Set<string>();
  for (const tecnologia of manifiesto) {
    // Solo las variantes de fuente: el portafolio usa clases CSS, no SVG
    // sueltos, y `versions.svg` incluye variantes que la fuente no trae.
    for (const variante of tecnologia.versions.font ?? []) {
      validas.add(`devicon-${tecnologia.name}-${variante}`);
    }
    for (const alias of tecnologia.aliases ?? []) {
      validas.add(`devicon-${tecnologia.name}-${alias.alias}`);
    }
  }
  return validas;
}

/** Recorre cualquier estructura y recoge el valor de todas las claves `icon`. */
function iconosDe(datos: unknown, procedencia: string): { icono: string; donde: string }[] {
  const encontrados: { icono: string; donde: string }[] = [];

  const recorrer = (nodo: unknown, camino: string): void => {
    if (Array.isArray(nodo)) {
      nodo.forEach((hijo, i) => recorrer(hijo, `${camino}[${i}]`));
      return;
    }
    if (nodo === null || typeof nodo !== 'object') return;

    for (const [clave, valor] of Object.entries(nodo as Record<string, unknown>)) {
      if (clave === 'icon' && typeof valor === 'string' && valor.trim()) {
        encontrados.push({ icono: valor, donde: `${camino}.${clave}` });
      } else {
        recorrer(valor, `${camino}.${clave}`);
      }
    }
  };

  recorrer(datos, procedencia);
  return encontrados;
}

const FICHEROS = ['projects.json', 'skills.json', 'experiences.json'];

test.describe('iconos', () => {
  test('todas las clases devicon de los datos existen', () => {
    const validas = clasesValidas();
    expect(validas.size).toBeGreaterThan(1000);

    const rotos: string[] = [];

    for (const fichero of FICHEROS) {
      const datos = JSON.parse(
        readFileSync(join(RAIZ, 'src', 'assets', 'data', fichero), 'utf-8'));

      for (const { icono, donde } of iconosDe(datos, fichero)) {
        // Algunos iconos llevan " colored" detras, que es un modificador de
        // devicon y no parte del nombre de la tecnologia.
        const base = icono.replace(/\s+colored\s*$/, '').trim();

        // Los que no son de devicon (PrimeIcons, rutas a un svg propio) no se
        // comprueban aqui: esta lista solo sabe de devicon.
        if (!base.startsWith('devicon-')) continue;

        if (!validas.has(base)) {
          rotos.push(`${donde}: "${icono}"`);
        }
      }
    }

    expect(rotos,
      'Estas clases no existen en devicon y no dibujan nada.\n' +
      'Mira las variantes reales en node_modules/devicon/devicon.json: no todas\n' +
      'las tecnologias traen "original", muchas solo tienen "plain".\n\n' +
      rotos.join('\n')).toEqual([]);
  });
});
