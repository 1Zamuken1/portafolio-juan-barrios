#!/usr/bin/env node
/**
 * Lo comun a los scripts que hablan con la API: a donde apuntan, como piden
 * la clave y como sacan el token.
 *
 * Vive aparte porque lo usan mirror.mjs y draft.mjs, y los mensajes de error
 * de aqui salieron de depurar fallos reales --un 401 por un retorno de carro
 * pegado, un contenedor viejo sirviendo la variable anterior--. Dos copias de
 * esto acabarian separandose y perdiendo justo esos avisos.
 */

import { createInterface } from 'node:readline';

export const API = process.env.MIRROR_API ?? 'https://portafolio-juan-barrios.onrender.com/api';

// Se recortan los extremos: al pegar una credencial en una terminal de
// Windows es facil arrastrar un retorno de carro, y eso da un 401 confuso
// porque la clave viaja con un caracter de mas.
export const limpiar = (v) => (typeof v === 'string' ? v.trim() : v);

const USUARIO = limpiar(process.env.MIRROR_USER);
const CLAVE = limpiar(process.env.MIRROR_PASSWORD);

/**
 * Pide un dato por teclado sin mostrarlo.
 *
 * La clave se pregunta aqui y no se deja al shell a proposito: si se usa
 * `read` dentro de un bloque pegado de varias lineas, bash lo alimenta con
 * la linea siguiente del propio pegado en vez de esperar al teclado, y la
 * credencial acaba vacia o con basura sin que se note.
 */
export function preguntarOculto(etiqueta) {
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
export function preguntar(etiqueta) {
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

export async function token() {
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
