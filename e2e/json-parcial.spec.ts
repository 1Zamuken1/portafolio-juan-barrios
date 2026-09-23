import { test, expect } from '@playwright/test';
import { leerJsonParcial } from '../src/app/shared/utils/json-parcial';

/**
 * El lector del JSON a medias que alimenta la vista previa del redactor.
 *
 * Lo que importa no es que lea JSON bien formado --eso ya lo hace JSON.parse--
 * sino lo que hace en cada sitio donde puede caer un corte: dentro de una
 * clave, dentro de un escape, justo despues de los dos puntos. Cada una de
 * esas es una forma de ensenar en la vista algo que el modelo no ha escrito.
 */

const COMPLETO = JSON.stringify({
  name: 'Tsuki Translator',
  shortDescription: 'Traductor de subtítulos.',
  readmeMarkdown: { objective: 'Traducir "sin" salir\ndel equipo.' },
  challenges: [{ title: 'Memoria', description: 'Cargar el modelo.' }]
});

test('lee un JSON entero igual que JSON.parse', () => {
  const r = leerJsonParcial(COMPLETO);
  expect(r.valor).toEqual(JSON.parse(COMPLETO));
  expect(r.abierta).toBeNull();
});

test('ningun corte hace fallar la lectura', () => {
  // Se prueba cortando por cada posicion posible, que es lo que de verdad pasa
  // con un flujo: el trozo puede terminar en cualquier caracter.
  for (let n = 0; n <= COMPLETO.length; n++) {
    expect(() => leerJsonParcial(COMPLETO.slice(0, n))).not.toThrow();
  }
});

test('lo leido nunca pierde lo que ya se habia leido', () => {
  // Si al llegar una letra mas desapareciera un campo que ya estaba, la vista
  // parpadearia: el texto se borraria y volveria a aparecer.
  let anterior = '';
  for (let n = 0; n <= COMPLETO.length; n++) {
    const nombre = (leerJsonParcial(COMPLETO.slice(0, n)).valor as { name?: string })?.name ?? '';
    expect(nombre.startsWith(anterior)).toBe(true);
    anterior = nombre;
  }
});

test('una cadena cortada se devuelve a medias y se marca como abierta', () => {
  const r = leerJsonParcial('{"name":"Tsuki Tra');
  expect(r.valor).toEqual({ name: 'Tsuki Tra' });
  expect(r.abierta).toBe('name');
  expect(r.cerradas.has('name')).toBe(false);
});

test('una cadena cerrada se da por terminada aunque siga el objeto', () => {
  const r = leerJsonParcial('{"name":"Tsuki","shortDescription":"Trad');
  expect(r.cerradas.has('name')).toBe(true);
  expect(r.abierta).toBe('shortDescription');
});

test('una clave cortada no aparece como campo', () => {
  // "short" no es todavia shortDescription: no se sabe que campo va a ser.
  const r = leerJsonParcial('{"name":"Tsuki","short');
  expect(r.valor).toEqual({ name: 'Tsuki' });
  expect(r.abierta).toBeNull();
});

test('las rutas llevan el objeto y el indice', () => {
  const r = leerJsonParcial('{"readmeMarkdown":{"objective":"A"},"challenges":[{"title":"B"},{"title":"C');
  expect(r.cerradas.has('readmeMarkdown.objective')).toBe(true);
  expect(r.cerradas.has('challenges.0.title')).toBe(true);
  expect(r.abierta).toBe('challenges.1.title');
});

test('un escape partido no deja la barra a la vista', () => {
  expect(leerJsonParcial('{"a":"linea\\').valor).toEqual({ a: 'linea' });
  expect(leerJsonParcial('{"a":"t\\u00').valor).toEqual({ a: 't' });
  expect(leerJsonParcial('{"a":"t\\u00ed').valor).toEqual({ a: 'tí' });
  expect(leerJsonParcial('{"a":"x\\ny').valor).toEqual({ a: 'x\ny' });
});

test('sin llave de apertura no hay nada que leer', () => {
  expect(leerJsonParcial('').valor).toBeUndefined();
  expect(leerJsonParcial('   ').valor).toBeUndefined();
});

test('el texto antes de la primera llave se ignora', () => {
  expect(leerJsonParcial('```json\n{"name":"A"').valor).toEqual({ name: 'A' });
});
