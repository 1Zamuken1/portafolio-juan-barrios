import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * Cada icono del portafolio tiene que existir de verdad en devicon.
 *
 * Un nombre de clase inventado no falla: no dibuja nada. Queda un hueco en la
 * ficha y no hay error en consola, así que solo se descubre mirando la página
 * con atención. Ha pasado tres veces: `devicon-uml-plain`, que se arregló a
 * mano; `devicon-angular-original` y `devicon-playwright-original` en los
 * datos; y otra vez `devicon-angular-original`, esta escrita a mano en
 * `projects.component.ts`.
 *
 * Esa tercera se escapó porque la versión anterior de este test **solo miraba
 * los JSON de datos**. Los iconos también viven en el código: hay una cascada
 * de respaldo que asigna uno según el nombre de la tecnología. Por eso ahora
 * se recorren las dos fuentes.
 *
 * La lista buena sale de `devicon.min.css`, no de `devicon.json`. El JSON
 * describe qué variantes *deberían* existir; el CSS es el que define las
 * reglas que el navegador aplica, así que es el único que responde a la
 * pregunta real: ¿esta clase dibuja algo?
 */
const RAIZ = join(__dirname, '..');

/** Las clases que el CSS de devicon define de verdad. */
function clasesDefinidas(): Set<string> {
  const css = readFileSync(join(RAIZ, 'node_modules', 'devicon', 'devicon.min.css'), 'utf-8');
  const definidas = new Set<string>();

  // Una regla puede agrupar varios selectores compartiendo glifo:
  //   .devicon-react-original:before,.devicon-react-plain:before{content:"…"}
  for (const regla of css.matchAll(
    /((?:\.devicon-[A-Za-z0-9-]+:before\s*,?\s*)+)\{\s*content:\s*"(.+?)"\s*\}/g)) {
    for (const sel of regla[1].matchAll(/\.(devicon-[A-Za-z0-9-]+):before/g)) {
      definidas.add(sel[1]);
    }
  }
  return definidas;
}

/** Todos los ficheros bajo un directorio con alguna de las extensiones dadas. */
function ficheros(dir: string, extensiones: string[]): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...ficheros(ruta, extensiones));
    else if (extensiones.includes(extname(entrada))) salida.push(ruta);
  }
  return salida;
}

/** Clase de icono encontrada, con el sitio donde estaba. */
type Uso = { clase: string; donde: string };

/** Los `icon` de los ficheros de datos. */
function iconosDeDatos(): Uso[] {
  const usos: Uso[] = [];

  const recorrer = (nodo: unknown, camino: string): void => {
    if (Array.isArray(nodo)) {
      nodo.forEach((hijo, i) => recorrer(hijo, `${camino}[${i}]`));
      return;
    }
    if (nodo === null || typeof nodo !== 'object') return;

    for (const [clave, valor] of Object.entries(nodo as Record<string, unknown>)) {
      if (clave === 'icon' && typeof valor === 'string' && valor.trim()) {
        usos.push({ clase: valor, donde: `${camino}.${clave}` });
      } else {
        recorrer(valor, `${camino}.${clave}`);
      }
    }
  };

  for (const fichero of ['projects.json', 'skills.json', 'experiences.json']) {
    const datos = JSON.parse(readFileSync(join(RAIZ, 'src', 'assets', 'data', fichero), 'utf-8'));
    recorrer(datos, fichero);
  }
  return usos;
}

/** Las clases devicon escritas directamente en plantillas y componentes. */
function iconosDeCodigo(): Uso[] {
  const usos: Uso[] = [];
  for (const ruta of ficheros(join(RAIZ, 'src', 'app'), ['.ts', '.html'])) {
    const texto = readFileSync(ruta, 'utf-8');
    texto.split('\n').forEach((linea, i) => {
      for (const m of linea.matchAll(/devicon-[a-z0-9-]+/g)) {
        usos.push({ clase: m[0], donde: `${ruta.slice(RAIZ.length + 1)}:${i + 1}` });
      }
    });
  }
  return usos;
}

test.describe('iconos', () => {
  const definidas = clasesDefinidas();

  test('el CSS de devicon se lee correctamente', () => {
    // Si el parseo fallara, todo lo demas daria falsos negativos en silencio.
    expect(definidas.size).toBeGreaterThan(1000);
    expect(definidas.has('devicon-angular-plain')).toBe(true);
    expect(definidas.has('devicon-angular-original')).toBe(false);
  });

  test('todas las clases devicon de los datos existen', () => {
    const rotos = iconosDeDatos()
      .map((u) => ({ ...u, base: u.clase.replace(/\s+colored\s*$/, '').trim() }))
      .filter((u) => u.base.startsWith('devicon-') && !definidas.has(u.base))
      .map((u) => `${u.donde}: "${u.clase}"`);

    expect(rotos, mensaje(rotos)).toEqual([]);
  });

  test('todas las clases devicon escritas en el codigo existen', () => {
    // Este es el que faltaba. La cascada de respaldo de ProjectsComponent
    // asigna iconos por nombre de tecnologia y tenia uno inexistente.
    const rotos = iconosDeCodigo()
      .filter((u) => !definidas.has(u.clase))
      .map((u) => `${u.donde}: "${u.clase}"`);

    expect(rotos, mensaje(rotos)).toEqual([]);
  });
});

function mensaje(rotos: string[]): string {
  return (
    'Estas clases no existen en devicon y no dibujan nada.\n' +
    'No todas las tecnologias traen "original": muchas solo tienen "plain".\n' +
    'Las variantes reales estan en node_modules/devicon/devicon.min.css.\n\n' +
    rotos.join('\n')
  );
}
