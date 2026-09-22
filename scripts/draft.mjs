#!/usr/bin/env node
/**
 * Prueba el redactor de borradores contra el backend desplegado.
 *
 *   node scripts/draft.mjs <fichero-readme> "<nombre del proyecto>"
 *
 * Imprime el borrador que devuelve la API. NO guarda nada: el endpoint solo
 * redacta, y este script solo enseña el resultado. Sirve para comprobar que
 * GROQ_API_KEY está bien puesta sin tener que abrir el panel.
 *
 * La clave del panel se pide por teclado y no se muestra, igual que en
 * mirror.mjs: asi no queda en el historial del shell ni hay que teclearla en
 * ningun sitio que la guarde.
 */

import { readFileSync } from 'node:fs';
import { API, token } from './lib/api.mjs';

const [, , ruta, ...resto] = process.argv;
const nombre = resto.join(' ').trim();

if (!ruta || !nombre) {
  console.error('Uso: node scripts/draft.mjs <fichero-readme> "<nombre del proyecto>"');
  console.error('Ejemplo: node scripts/draft.mjs ../gastu/README.md "Gastu Django"');
  process.exit(1);
}

let readme;
try {
  readme = readFileSync(ruta, 'utf-8');
} catch (e) {
  console.error(`No se pudo leer ${ruta}: ${e.message}`);
  process.exit(1);
}

if (readme.trim().length < 200) {
  console.error(
    `El readme tiene ${readme.trim().length} caracteres y el minimo son 200.\n` +
    'Con menos que eso el borrador se lo inventaria casi todo, asi que el\n' +
    'backend lo rechazaria igualmente.');
  process.exit(1);
}

const separador = (titulo) => `\n${'─'.repeat(70)}\n${titulo}\n${'─'.repeat(70)}`;

console.log(`Redactando "${nombre}" contra ${API}`);
console.log(`Readme: ${ruta} (${readme.trim().length} caracteres)`);

try {
  const jwt = await token();

  const inicio = Date.now();
  const res = await fetch(`${API}/projects/draft`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${jwt}`
    },
    body: JSON.stringify({ name: nombre, readme })
  });
  const segundos = ((Date.now() - inicio) / 1000).toFixed(1);

  const cuerpo = await res.text();

  // Los tres fallos que interesa distinguir, porque lo que hay que hacer en
  // cada uno es distinto.
  if (res.status === 503) {
    const { error } = JSON.parse(cuerpo);
    console.error(`\nEl redactor no esta disponible: ${error}`);
    if (error.includes('GROQ_API_KEY')) {
      console.error(
        '\nDefine GROQ_API_KEY en el dashboard de Render y espera a que el\n' +
        'redespliegue aparezca como Live. Al cambiar una variable, el\n' +
        'contenedor viejo sigue sirviendo un rato con el valor anterior.');
    }
    process.exit(1);
  }
  if (res.status === 404 || res.status === 405) {
    console.error(
      `\nLa API respondio ${res.status}: el backend desplegado todavia no tiene\n` +
      'este endpoint. La rama feat/ai-drafter tiene que estar fusionada y\n' +
      'redesplegada en Render.');
    process.exit(1);
  }
  if (!res.ok) {
    console.error(`\nPOST /projects/draft respondio ${res.status}:\n${cuerpo}`);
    process.exit(1);
  }

  const b = JSON.parse(cuerpo);

  console.log(`\nListo en ${segundos}s.`);
  console.log(separador('shortDescription'));
  console.log(`${b.shortDescription}   [${b.shortDescription.length} caracteres]`);
  console.log(separador('fullDescription'));
  console.log(`${b.fullDescription}\n   [${b.fullDescription.length} caracteres]`);

  for (const [clave, texto] of Object.entries(b.readmeMarkdown)) {
    console.log(separador(`readmeMarkdown.${clave}`));
    console.log(`${texto}\n   [${texto.length} caracteres]`);
  }

  console.log(separador(`challenges (${b.challenges.length})`));
  b.challenges.forEach((c, i) => {
    console.log(`\n${i + 1}. ${c.title}`);
    console.log(`   ${c.description}`);
  });

  console.log(
    '\nEsto NO se ha guardado en ningun sitio. Para usarlo, pega el readme en\n' +
    'el panel: /admin/dashboard/projects -> nuevo proyecto -> "Redactar desde\n' +
    'un readme".');
} catch (e) {
  console.error(`\nError: ${e.message}`);
  process.exit(1);
}
