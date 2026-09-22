#!/usr/bin/env node
/**
 * Espejo entre el backend y los JSON que consume el sitio publico.
 *
 *   node scripts/mirror.mjs push     JSON -> API   (siembra la base)
 *   node scripts/mirror.mjs pull     API -> JSON   (refresca el espejo)
 *   node scripts/mirror.mjs publish  pull + commit + push a la rama actual
 *
 * El sitio publico nunca habla con el backend: lee estos JSON, que se
 * compilan dentro del bundle. Por eso el portafolio siguio en pie cuando la
 * base de datos de Render desaparecio con todo su contenido.
 *
 * Esto se ejecuta a mano y su resultado se commitea. NO va en el build: si el
 * despliegue de Vercel dependiera de que Render esta despierto, volveria el
 * problema de arranque en frio que todo este diseno evita, y un backend
 * dormido podria tumbar un despliegue.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { execFileSync } from 'node:child_process';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const DATOS = join(RAIZ, 'src', 'assets', 'data');

const API = process.env.MIRROR_API ?? 'https://portafolio-juan-barrios.onrender.com/api';
// Se recortan los extremos: al pegar una credencial en una terminal de
// Windows es facil arrastrar un retorno de carro, y eso da un 401 confuso
// porque la clave viaja con un caracter de mas.
const limpiar = (v) => (typeof v === 'string' ? v.trim() : v);

const USUARIO = limpiar(process.env.MIRROR_USER);
const CLAVE = limpiar(process.env.MIRROR_PASSWORD);

const ficheros = {
  projects: join(DATOS, 'projects.json'),
  experiences: join(DATOS, 'experiences.json'),
  skills: join(DATOS, 'skills.json')
};

// ── utilidades ───────────────────────────────────────────────────────────────

const leerJson = (ruta) => JSON.parse(readFileSync(ruta, 'utf-8'));

/**
 * Escribe respetando el orden de claves que ya tenia el fichero.
 *
 * Sin esto, el primer volcado reordenaria las 28 claves de cada proyecto y
 * produciria un diff de mil lineas en el que es imposible revisar si la
 * exportacion es correcta. Las claves nuevas se anaden al final.
 */
function escribirConOrdenPrevio(ruta, datos, plantilla) {
  const ordenar = (obj, modelo) => {
    // Los elementos de un array tambien se ordenan: sin esto, los objetos
    // anidados (los nodos del diagrama, por ejemplo) salen con sus claves en
    // otro orden y el diff se llena de ruido que oculta los cambios reales.
    if (Array.isArray(obj)) {
      const plantillaItem = Array.isArray(modelo) ? modelo[0] : undefined;
      return obj.map((item, i) => ordenar(item, (Array.isArray(modelo) ? modelo[i] : undefined) ?? plantillaItem));
    }
    if (obj === null || typeof obj !== 'object') return obj;
    if (!modelo || typeof modelo !== 'object' || Array.isArray(modelo)) return obj;

    const salida = {};
    for (const clave of Object.keys(modelo)) {
      if (clave in obj) salida[clave] = ordenar(obj[clave], modelo[clave]);
    }
    for (const clave of Object.keys(obj)) {
      if (!(clave in salida)) salida[clave] = obj[clave];
    }
    return salida;
  };

  const ordenados = Array.isArray(datos)
    ? datos.map((item, i) => ordenar(item, plantilla?.[i] ?? plantilla?.[0]))
    : ordenar(datos, plantilla);

  writeFileSync(ruta, JSON.stringify(ordenados, null, 2) + '\n', 'utf-8');
}

async function pedir(ruta, opciones = {}) {
  const res = await fetch(`${API}${ruta}`, opciones);
  if (!res.ok) {
    throw new Error(`${opciones.method ?? 'GET'} ${ruta} respondio ${res.status}: ${await res.text()}`);
  }
  return res.status === 204 ? null : res.json();
}

/**
 * Pide un dato por teclado sin mostrarlo.
 *
 * La clave se pregunta aqui y no se deja al shell a proposito: si se usa
 * `read` dentro de un bloque pegado de varias lineas, bash lo alimenta con
 * la linea siguiente del propio pegado en vez de esperar al teclado, y la
 * credencial acaba vacia o con basura sin que se note.
 */
function preguntarOculto(etiqueta) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error(
        'No hay terminal interactiva para pedir la clave. ' +
        'Define MIRROR_PASSWORD en el entorno antes de ejecutar el script.'
      ));
      return;
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (texto) => {
      // Solo pasa la etiqueta; lo tecleado no se escribe en pantalla.
      if (texto.includes(etiqueta)) rl.output.write(etiqueta);
    };
    rl.question(etiqueta, (valor) => {
      rl.output.write('\n');
      rl.close();
      resolve(limpiar(valor));
    });
  });
}

/** Pregunta mostrando lo que se teclea, para confirmaciones. */
function preguntar(etiqueta) {
  return new Promise((resolve, reject) => {
    if (!process.stdin.isTTY) {
      reject(new Error('No hay terminal interactiva para confirmar la publicacion.'));
      return;
    }
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    rl.question(etiqueta, (valor) => {
      rl.close();
      resolve(valor);
    });
  });
}

async function credenciales() {
  const usuario = USUARIO || 'admin';
  if (CLAVE) return { usuario, clave: CLAVE };

  console.log(
    '\nLa clave es la del PANEL DE ADMINISTRACION, la misma con la que entras\n' +
    'a /admin/login. NO es la de la base de datos (neondb_owner): este script\n' +
    'habla con la API REST, no con Postgres.\n'
  );
  const clave = await preguntarOculto(`Clave de "${usuario}": `);
  if (!clave) throw new Error('No se recibio ninguna clave.');
  return { usuario, clave };
}

async function token() {
  const { usuario: USUARIO, clave: CLAVE } = await credenciales();
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USUARIO, password: CLAVE })
  });

  // La API responde 401 con cuerpo vacio, asi que el detalle lo ponemos aqui.
  if (res.status === 401) {
    throw new Error(
      `La API rechazo las credenciales de "${USUARIO}".\n\n` +
      'Comprueba, por este orden:\n' +
      '  1. Que el redespliegue de Render haya terminado. Al cambiar una\n' +
      '     variable, el contenedor viejo sigue sirviendo un rato con el\n' +
      '     valor anterior. En Render, Events debe mostrar un deploy Live\n' +
      '     posterior a tu cambio.\n' +
      '  2. Que MIRROR_USER coincida con ADMIN_USERNAME en Render.\n' +
      '  3. Que la clave sea la que guardaste en ADMIN_PASSWORD.\n\n' +
      'Mismo endpoint desde el navegador, por si es mas comodo:\n' +
      '  https://portafolio-juan-barrios.vercel.app/admin/login'
    );
  }
  if (!res.ok) {
    throw new Error(`POST /auth/login respondio ${res.status}: ${await res.text()}`);
  }

  const { token } = await res.json();
  return token;
}

// ── skills: la API las sirve planas, el sitio las quiere por categoria ───────

function agruparSkills(planas) {
  const categorias = new Map();
  for (const s of [...planas].sort((a, b) => a.displayOrder - b.displayOrder)) {
    if (!categorias.has(s.category)) {
      categorias.set(s.category, { category: s.category, color: s.categoryColor, skills: [] });
    }
    categorias.get(s.category).skills.push({
      id: String(s.id),
      name: s.name,
      icon: s.icon,
      brandColor: s.color,
      brandColorLight: s.brandColorLight,
      description: s.description
    });
  }
  return [...categorias.values()];
}

function aplanarSkills(porCategoria) {
  const planas = [];
  let orden = 1;
  for (const cat of porCategoria) {
    for (const s of cat.skills) {
      planas.push({
        name: s.name,
        category: cat.category,
        categoryColor: cat.color,
        icon: s.icon,
        color: s.brandColor,
        brandColorLight: s.brandColorLight,
        brandColorDark: s.brandColorDark ?? null,
        description: s.description,
        displayOrder: orden++
      });
    }
  }
  return planas;
}

// ── operaciones ──────────────────────────────────────────────────────────────

async function push() {
  const jwt = await token();
  const cabeceras = { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` };

  const colecciones = [
    ['projects', leerJson(ficheros.projects)],
    ['experiences', leerJson(ficheros.experiences)],
    ['skills', aplanarSkills(leerJson(ficheros.skills))]
  ];

  for (const [nombre, items] of colecciones) {
    const existentes = await pedir(`/${nombre}`);
    for (const viejo of existentes) {
      await pedir(`/${nombre}/${viejo.id}`, { method: 'DELETE', headers: cabeceras });
    }
    for (const item of items) {
      const { id, ...sinId } = item; // la base asigna el suyo
      await pedir(`/${nombre}`, { method: 'POST', headers: cabeceras, body: JSON.stringify(sinId) });
    }
    console.log(`  ${nombre}: ${items.length} enviados (${existentes.length} reemplazados)`);
  }
}

/**
 * Devuelve los proyectos con el id que ya tenian en el JSON, emparejando por
 * slug.
 *
 * La base asigna ids nuevos en cada siembra, y las URLs publicas son
 * /projects/<id>: sin esto, un ciclo push/pull renumeraria los casos de
 * estudio y romperia los enlaces existentes, el sitemap y los canonical.
 */
function conservarIds(deLaApi, delFichero) {
  const idPorSlug = new Map(delFichero.map((p) => [p.slug, p.id]));
  return deLaApi.map((p) => {
    const previo = idPorSlug.get(p.slug);
    return previo === undefined ? p : { ...p, id: previo };
  });
}

async function pull() {
  const [proyectos, experiencias, skills] = await Promise.all([
    pedir('/projects'),
    pedir('/experiences'),
    pedir('/skills')
  ]);

  // Ninguna coleccion puede encoger. Protege a las tres, no solo a projects:
  // una siembra que falla a medias deja la base con unas coleccciones llenas y
  // otras vacias, y el volcado se llevaria por delante las que quedaron sin
  // sembrar. Paso: un push fallo al llegar a experiences y el volcado
  // siguiente escribio [] en experiences.json y skills.json.
  const conteos = [
    ['projects', proyectos.length, leerJson(ficheros.projects).length],
    ['experiences', experiencias.length, leerJson(ficheros.experiences).length],
    ['skills', skills.length, leerJson(ficheros.skills).reduce((n, c) => n + c.skills.length, 0)]
  ];

  const encogidas = conteos.filter(([, api, fichero]) => api < fichero);
  if (encogidas.length && process.env.MIRROR_ALLOW_SHRINK !== '1') {
    throw new Error(
      'La API devuelve menos registros que el JSON:\n' +
      encogidas.map(([n, api, fich]) => `  ${n}: ${api} en la API, ${fich} en el fichero`).join('\n') +
      '\n\nAborto: escribir esto borraria contenido del que no hay otra copia.\n' +
      'Suele significar que la siembra fallo a medias; revisa la salida del push.\n' +
      'Si de verdad quieres reducirlas, repite con MIRROR_ALLOW_SHRINK=1.'
    );
  }

  const previos = leerJson(ficheros.projects);

  // Contar proyectos no basta: un backend desactualizado devuelve el numero
  // correcto de proyectos pero vacios por dentro, porque descarta en silencio
  // los campos que su modelo no conoce. Sobrescribir con eso se lleva los
  // diagramas, el readme y las metricas, y el JSON es la unica copia que hay.
  const claves = (lista) => new Set(lista.flatMap((p) => Object.keys(p)));
  const antes = claves(previos);
  const ahora = claves(proyectos);
  const perdidos = [...antes].filter((c) => !ahora.has(c));

  if (perdidos.length) {
    throw new Error(
      `La API no devuelve ${perdidos.length} campo(s) que el JSON si tiene:\n` +
      `  ${perdidos.join(', ')}\n\n` +
      'Aborto: escribir esto borraria ese contenido y no hay otra copia.\n\n' +
      'Casi siempre significa que el backend desplegado es anterior al modelo\n' +
      'actual. Render despliega desde master: comprueba que los cambios del\n' +
      'backend esten ahi y que el despliegue haya terminado antes de sembrar.'
    );
  }
  const sinRenumerar = conservarIds(proyectos, previos);
  const nuevos = sinRenumerar.filter((p) => !previos.some((q) => q.slug === p.slug));
  if (nuevos.length) {
    console.log(`  aviso: ${nuevos.length} proyecto(s) sin id previo, reciben el de la base: ${nuevos.map((p) => p.slug).join(', ')}`);
  }

  escribirConOrdenPrevio(ficheros.projects, sinRenumerar, previos);
  escribirConOrdenPrevio(ficheros.experiences, experiencias, leerJson(ficheros.experiences));
  escribirConOrdenPrevio(ficheros.skills, agruparSkills(skills), leerJson(ficheros.skills));

  console.log(`  projects: ${proyectos.length}`);
  console.log(`  experiences: ${experiencias.length}`);
  console.log(`  skills: ${skills.length}`);
  console.log('\nRevisa el diff con git antes de commitear.');
}

// ── publicar ─────────────────────────────────────────────────────────────────

const git = (...args) => execFileSync('git', args, { cwd: RAIZ, encoding: 'utf-8' }).trim();

/**
 * Vuelca y deja el cambio commiteado y empujado, listo para abrir el PR.
 *
 * El PR se mantiene manual a proposito: es el diff revisable lo que permite
 * ver que se publica, y es lo que salvo el contenido las dos veces que el
 * panel de administracion lo borro. Automatizar hasta el merge quitaria
 * justamente la red.
 */
async function publish() {
  await pull();

  git('add', 'src/assets/data');
  const pendiente = git('diff', '--cached', '--name-only');
  if (!pendiente) {
    console.log('\nNada que publicar: el espejo ya coincide con la base.');
    return;
  }

  console.log('\nCambios a publicar:');
  console.log(git('diff', '--cached', '--stat'));
  console.log('\n' + git('diff', '--cached'));

  // Se pregunta antes de commitear: el volcado recoge fielmente lo que hay en
  // la base, pero lo que hay puede estar mal. Ocurrio de verdad: el formulario
  // del panel partio unas viñetas por sus comas y el volcado lo publico tal
  // cual. Ver el diff antes de aceptar es justamente la red de este flujo.
  let respuesta;
  try {
    respuesta = await preguntar('\n¿Publicar estos cambios? [s/N]: ');
  } catch (e) {
    // Sin terminal no se puede confirmar: se deshace la preparacion para no
    // dejar el repositorio a medias.
    git('reset', 'src/assets/data');
    throw e;
  }

  if (!/^s(i)?$/i.test(respuesta.trim())) {
    git('reset', 'src/assets/data');
    console.log('Cancelado. Los ficheros conservan los cambios sin commitear; ' +
                'usa "git checkout -- src/assets/data" para descartarlos.');
    return;
  }

  git('commit', '-m', 'chore(data): actualizar el espejo desde el backend');
  const rama = git('rev-parse', '--abbrev-ref', 'HEAD');
  git('push', 'origin', rama);

  console.log(`\nCommiteado y empujado a ${rama}.`);
  console.log('Falta abrir el pull request hacia master para que Vercel despliegue:');
  console.log(`  https://github.com/1Zamuken1/portafolio-juan-barrios/compare/master...${rama}?expand=1`);
}

// ── entrada ──────────────────────────────────────────────────────────────────

const modos = { push, pull, publish };
const modo = process.argv[2];
if (!modos[modo]) {
  console.error('Uso: node scripts/mirror.mjs <push|pull|publish>');
  process.exit(1);
}

console.log(`Espejo ${modo} contra ${API}`);
try {
  await modos[modo]();
} catch (e) {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
}
