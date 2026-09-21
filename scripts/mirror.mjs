#!/usr/bin/env node
/**
 * Espejo entre el backend y los JSON que consume el sitio publico.
 *
 *   node scripts/mirror.mjs push   JSON -> API   (siembra la base)
 *   node scripts/mirror.mjs pull   API -> JSON   (refresca el espejo)
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
    if (Array.isArray(obj)) return obj;
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

async function token() {
  if (!USUARIO || !CLAVE) {
    throw new Error(
      'Faltan credenciales.\n\n' +
      'Son las del PANEL DE ADMINISTRACION, las mismas con las que entras a\n' +
      '/admin/login: ADMIN_USERNAME y ADMIN_PASSWORD, las que definiste en\n' +
      'Render. NO son las de la base de datos (neondb_owner): este script\n' +
      'habla con la API REST, no con Postgres.\n\n' +
      'Definelas solo en esta terminal, nunca en el repositorio:\n' +
      '  PowerShell:  $env:MIRROR_USER="admin"; $env:MIRROR_PASSWORD="..."\n' +
      '  Git Bash:    export MIRROR_USER=admin MIRROR_PASSWORD=...'
    );
  }
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

  if (!proyectos.length) {
    throw new Error('La API devolvio cero proyectos. Aborto: sobrescribir el JSON con esto vaciaria el sitio.');
  }

  const previos = leerJson(ficheros.projects);
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

// ── entrada ──────────────────────────────────────────────────────────────────

const modo = process.argv[2];
if (modo !== 'push' && modo !== 'pull') {
  console.error('Uso: node scripts/mirror.mjs <push|pull>');
  process.exit(1);
}

console.log(`Espejo ${modo} contra ${API}`);
try {
  await (modo === 'push' ? push() : pull());
} catch (e) {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
}
