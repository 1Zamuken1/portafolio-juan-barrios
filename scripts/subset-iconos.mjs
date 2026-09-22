#!/usr/bin/env node
/**
 * Genera una fuente de iconos con solo los que el portafolio usa.
 *
 *   node scripts/subset-iconos.mjs
 *
 * El sitio cargaba devicon y Font Awesome enteros desde dos CDN. La fuente de
 * devicon sola son 777 kB comprimidos --el 70% del peso de la portada-- para
 * dibujar unos pocos iconos de los 1201 que trae. Font Awesome sumaba otros
 * 19 kB de CSS.
 *
 * Esto recorre el proyecto, se queda con los iconos que de verdad aparecen y
 * recorta las fuentes a esos glifos. El resultado se commitea en public/fonts/
 * para que ni CI ni Vercel necesiten Python: aqui solo se regenera.
 *
 * DOS FUENTES DE ICONOS, y las dos hay que mirarlas:
 *
 *   - Los ficheros de datos, en las claves `icon`.
 *   - El codigo, porque ProjectsComponent tiene una cascada de respaldo que
 *     asigna un icono segun el nombre de la tecnologia, y el panel de
 *     administracion y el ring 3D usan clases de Font Awesome escritas a mano.
 *
 * Mirar solo los datos ya dejo pasar un icono inexistente una vez. Aqui seria
 * peor: los que no se encontraran no entrarian en la fuente y dejarian de
 * dibujarse.
 *
 * SOBRE EL RING 3D. `legacy-ring` y `knowledge-pillars` no se renderizan hoy,
 * pero su codigo sigue ahi por decision explicita. Sus iconos entran en el
 * subconjunto igual que los demas, justamente para que reactivarlo no exija
 * acordarse de nada.
 *
 * REQUISITO: Python con fonttools y brotli.
 *   pip install --user fonttools brotli
 */

import { readFileSync, writeFileSync, readdirSync, statSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const SALIDA = join(RAIZ, 'public', 'fonts');
const DATOS = join(RAIZ, 'src', 'assets', 'data');
const DEVICON = join(RAIZ, 'node_modules', 'devicon');
const FA = join(RAIZ, 'node_modules', '@fortawesome', 'fontawesome-free');

// ── recoleccion ──────────────────────────────────────────────────────────────

/** Todos los ficheros bajo un directorio con las extensiones dadas. */
function ficheros(dir, extensiones) {
  const salida = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...ficheros(ruta, extensiones));
    else if (extensiones.includes(extname(entrada))) salida.push(ruta);
  }
  return salida;
}

/** El texto de los datos y del codigo, todo junto, para buscar clases dentro. */
function textoDelProyecto() {
  const partes = [];
  for (const f of ['projects.json', 'skills.json', 'experiences.json']) {
    partes.push(readFileSync(join(DATOS, f), 'utf-8'));
  }
  for (const f of ficheros(join(RAIZ, 'src', 'app'), ['.ts', '.html'])) {
    partes.push(readFileSync(f, 'utf-8'));
  }
  return partes.join('\n');
}

const texto = textoDelProyecto();

const clasesDevicon = [...new Set([...texto.matchAll(/devicon-[a-z0-9-]+/g)].map((m) => m[0]))].sort();
const clasesFa = [...new Set([...texto.matchAll(/\bfa-([a-z0-9-]+)/g)].map((m) => m[1]))]
  // fa-solid y compania nombran la familia, no un icono.
  .filter((n) => !['solid', 'regular', 'brands', 'classic', 'fw', 'spin', 'pulse'].includes(n))
  .sort();

// ── devicon ──────────────────────────────────────────────────────────────────

const cssDevicon = readFileSync(join(DEVICON, 'devicon.min.css'), 'utf-8');

/**
 * Clase -> caracter del glifo.
 *
 * Una regla puede agrupar varios selectores compartiendo glifo:
 *   .devicon-react-original:before,.devicon-react-plain:before{content:"…"}
 * Quedarse solo con el ultimo selector pierde el resto, que es un fallo que ya
 * se cometio una vez leyendo este mismo fichero.
 */
const glifoDevicon = new Map();
for (const regla of cssDevicon.matchAll(
  /((?:\.devicon-[A-Za-z0-9-]+:before\s*,?\s*)+)\{\s*content:\s*"(.+?)"\s*\}/g)) {
  for (const sel of regla[1].matchAll(/\.(devicon-[A-Za-z0-9-]+):before/g)) {
    glifoDevicon.set(sel[1], regla[2]);
  }
}

/** Clase -> color de marca, de las reglas `.colored` de devicon. */
const colorDevicon = new Map();
for (const regla of cssDevicon.matchAll(
  /((?:\.[A-Za-z0-9_-]+(?:\.colored)?\s*,?\s*)+)\{\s*color:\s*(#[0-9a-fA-F]{3,8})\s*\}/g)) {
  for (const sel of regla[1].matchAll(/\.(devicon-[A-Za-z0-9-]+)\.colored/g)) {
    colorDevicon.set(sel[1], regla[2]);
  }
}

/** La regla base de devicon, copiada tal cual en vez de reescrita a mano. */
const baseDevicon = cssDevicon.match(
  /\[class\^=devicon-\][^{]*\{[^}]*\}/)?.[0]
  ?? '[class^=devicon-],[class*=" devicon-"]{font-family:"devicon"!important;font-style:normal;font-weight:normal;line-height:1}';

// ── font awesome ─────────────────────────────────────────────────────────────

const metaFa = JSON.parse(readFileSync(join(FA, 'metadata', 'icon-families.json'), 'utf-8'));

/** Nombre -> { codepoint, familia }. Se prefiere solid, que es lo que usan las plantillas. */
const glifoFa = new Map();
for (const nombre of clasesFa) {
  const meta = metaFa[nombre];
  if (!meta) continue;
  const estilos = new Set((meta.familyStylesByLicense?.free ?? []).map((x) => x.style));
  const familia = estilos.has('solid') ? 'solid' : estilos.has('brands') ? 'brands' : 'regular';
  glifoFa.set(nombre, { cp: parseInt(meta.unicode, 16), familia });
}

// ── recorte ──────────────────────────────────────────────────────────────────

/** Llama a pyftsubset y devuelve el tamano del fichero generado. */
function recortar(origen, destino, codepoints) {
  const unicodes = codepoints.map((c) => 'U+' + c.toString(16).toUpperCase()).join(',');
  try {
    execFileSync('python', [
      '-m', 'fontTools.subset', origen,
      `--unicodes=${unicodes}`,
      '--flavor=woff2',
      `--output-file=${destino}`,
      '--no-hinting',
      '--desubroutinize'
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (e) {
    throw new Error(
      `No se pudo recortar ${origen}.\n` +
      'Hace falta Python con fonttools y brotli:\n' +
      '  pip install --user fonttools brotli\n\n' +
      (e.stderr?.toString() ?? e.message));
  }
  return statSync(destino).size;
}

const kB = (n) => (n / 1024).toFixed(1).padStart(7) + ' kB';

mkdirSync(SALIDA, { recursive: true });

// devicon
const conGlifo = clasesDevicon.filter((c) => glifoDevicon.has(c));
const sinGlifo = clasesDevicon.filter((c) => !glifoDevicon.has(c));
if (sinGlifo.length) {
  throw new Error(
    'Estas clases devicon no existen y no dibujarian nada:\n  ' + sinGlifo.join('\n  ') +
    '\n\nCorrigelas antes de generar la fuente. Las variantes reales estan en\n' +
    'node_modules/devicon/devicon.min.css: no todas las tecnologias traen\n' +
    '"original", muchas solo tienen "plain".');
}

const cpsDevicon = [...new Set(conGlifo.map((c) => glifoDevicon.get(c).codePointAt(0)))];
const bytesDevicon = recortar(
  join(DEVICON, 'fonts', 'devicon.ttf'), join(SALIDA, 'devicon-subset.woff2'), cpsDevicon);

// font awesome, una fuente por familia
const porFamilia = { solid: [], brands: [], regular: [] };
for (const [, { cp, familia }] of glifoFa) porFamilia[familia].push(cp);

const ficherosFa = {
  solid: 'fa-solid-900.woff2',
  brands: 'fa-brands-400.woff2',
  regular: 'fa-regular-400.woff2'
};
const bytesFa = {};
for (const [familia, cps] of Object.entries(porFamilia)) {
  if (!cps.length) continue;
  bytesFa[familia] = recortar(
    join(FA, 'webfonts', ficherosFa[familia]),
    join(SALIDA, `fa-${familia}-subset.woff2`),
    cps);
}

// ── css ──────────────────────────────────────────────────────────────────────

const familiaFa = { solid: 'Font Awesome 6 Free', brands: 'Font Awesome 6 Brands', regular: 'Font Awesome 6 Free' };
const pesoFa = { solid: 900, brands: 400, regular: 400 };

const lineas = [
  '/* GENERADO POR scripts/subset-iconos.mjs — NO EDITAR A MANO.',
  ' *',
  ' * Contiene solo los iconos que el proyecto usa. Si anades uno nuevo en los',
  ' * datos o en el codigo, vuelve a ejecutar el script o no se dibujara.',
  ' * Lo vigila e2e/iconos.spec.ts.',
  ' *',
  ` * devicon: ${conGlifo.length} clases, ${cpsDevicon.length} glifos.`,
  ` * font awesome: ${glifoFa.size} iconos.`,
  ' */',
  '',
  '/* ── devicon ── */',
  '@font-face{font-family:"devicon";src:url("devicon-subset.woff2") format("woff2");' +
    'font-weight:normal;font-style:normal;font-display:block}',
  baseDevicon,
  ''
];

for (const clase of conGlifo) {
  lineas.push(`.${clase}:before{content:"${glifoDevicon.get(clase)}"}`);
}
lineas.push('');
lineas.push('/* Colores de marca, que las plantillas piden anadiendo la clase `colored`. */');
for (const clase of conGlifo) {
  const color = colorDevicon.get(clase);
  if (color) lineas.push(`.${clase}.colored{color:${color}}`);
}

lineas.push('', '/* ── font awesome ── */');
for (const familia of Object.keys(bytesFa)) {
  lineas.push(
    `@font-face{font-family:"${familiaFa[familia]}";font-style:normal;` +
    `font-weight:${pesoFa[familia]};font-display:block;` +
    `src:url("fa-${familia}-subset.woff2") format("woff2")}`);
}
lineas.push(
  '.fa,.fas,.far,.fab,.fa-solid,.fa-regular,.fa-brands{-moz-osx-font-smoothing:grayscale;' +
  '-webkit-font-smoothing:antialiased;display:var(--fa-display,inline-block);font-style:normal;' +
  'font-variant:normal;line-height:1;text-rendering:auto}',
  '.fas,.fa-solid{font-family:"Font Awesome 6 Free";font-weight:900}',
  '.far,.fa-regular{font-family:"Font Awesome 6 Free";font-weight:400}',
  '.fab,.fa-brands{font-family:"Font Awesome 6 Brands";font-weight:400}',
  '');

for (const [nombre, { cp }] of [...glifoFa].sort()) {
  lineas.push(`.fa-${nombre}:before{content:"\\${cp.toString(16)}"}`);
}

const css = lineas.join('\n') + '\n';
writeFileSync(join(SALIDA, 'iconos.css'), css, 'utf-8');

// ── resumen ──────────────────────────────────────────────────────────────────

const sinMeta = clasesFa.filter((n) => !glifoFa.has(n));

console.log('\nIconos encontrados en datos y codigo');
console.log('─'.repeat(52));
console.log(`  devicon        ${String(conGlifo.length).padStart(3)} clases, ${cpsDevicon.length} glifos`);
console.log(`  font awesome   ${String(glifoFa.size).padStart(3)} iconos ` +
  `(${porFamilia.solid.length} solid, ${porFamilia.brands.length} brands, ${porFamilia.regular.length} regular)`);
if (sinMeta.length) console.log(`  AVISO: sin metadatos en Font Awesome: ${sinMeta.join(', ')}`);

console.log('\nGenerado en public/fonts/');
console.log('─'.repeat(52));
console.log(`  devicon-subset.woff2   ${kB(bytesDevicon)}   (de ${kB(statSync(join(DEVICON, 'fonts', 'devicon.ttf')).size)} sin recortar)`);
for (const [familia, bytes] of Object.entries(bytesFa)) {
  console.log(`  fa-${familia}-subset.woff2`.padEnd(25) + kB(bytes) +
    `   (de ${kB(statSync(join(FA, 'webfonts', ficherosFa[familia])).size)})`);
}
console.log(`  iconos.css             ${kB(Buffer.byteLength(css))}`);
