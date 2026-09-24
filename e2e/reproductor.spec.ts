import { test, expect } from '@playwright/test';
import {
  PASO_MIN,
  PRISA,
  RETRASO_MAX,
  Reproductor
} from '../src/app/features/admin/projects/redactor-borrador/reproductor';
import type { LineaPipeline } from '../src/app/core/services/borrador-stream.service';

/**
 * El ritmo de la redaccion, con un reloj falso.
 *
 * Lo que importa aqui es lo que el ritmo NO puede hacer: ensenar algo que no
 * ha llegado, aplicar un paso antes de que se vea el texto que habia delante,
 * o hacer esperar a un error. La velocidad exacta es una decision de diseño y
 * no se prueba.
 */

function montar(opciones: { inmediato?: boolean } = {}) {
  let reloj = 0;
  const visto: string[] = [];
  const aplicadas: LineaPipeline['etapa'][] = [];
  const r = new Reproductor({
    automatico: false,
    inmediato: opciones.inmediato,
    ahora: () => reloj,
    aplicar: (l) => aplicadas.push(l.etapa),
    mostrar: (t) => visto.push(t)
  });
  const avanzar = (ms: number, paso = 30) => {
    for (let t = 0; t < ms; t += paso) { reloj += paso; r.tic(reloj); }
  };
  return { r, visto, aplicadas, avanzar, ultimo: () => visto.at(-1) ?? '' };
}

const TEXTO = '{"name":"Tsuki Translator","shortDescription":"Traductor de subtitulos"}';

test('nunca se ensenia lo que no ha llegado', () => {
  const { r, avanzar, visto } = montar();
  r.recibir({ etapa: 'texto', detalle: TEXTO.slice(0, 20) });
  avanzar(5000);
  for (const t of visto) expect(TEXTO.slice(0, 20).startsWith(t)).toBe(true);
});

test('el texto sale poco a poco, no de golpe', () => {
  const { r, avanzar, ultimo } = montar();
  r.recibir({ etapa: 'texto', detalle: TEXTO });
  avanzar(150);
  expect(ultimo().length).toBeGreaterThan(0);
  expect(ultimo().length).toBeLessThan(TEXTO.length);
  avanzar(5000);
  expect(ultimo()).toBe(TEXTO);
});

test('un paso espera a que se vea el texto que llego antes que el', () => {
  const { r, avanzar, aplicadas, ultimo } = montar();
  r.recibir({ etapa: 'texto', detalle: TEXTO });
  r.recibir({ etapa: 'respuesta', detalle: 'listo' });
  avanzar(200);
  expect(aplicadas).not.toContain('respuesta');
  avanzar(5000);
  expect(ultimo()).toBe(TEXTO);
  expect(aplicadas).toContain('respuesta');
});

test('entre dos pasos pasa un minimo, para que cada uno se vea', () => {
  const { r, avanzar, aplicadas } = montar();
  r.recibir({ etapa: 'entrada' });
  r.recibir({ etapa: 'modelo' });
  avanzar(PASO_MIN + 30);
  expect(aplicadas).toEqual(['entrada']);
  avanzar(PASO_MIN + 30);
  expect(aplicadas).toEqual(['entrada', 'modelo']);
});

test('un error respeta el orden, pero lo pendiente se acelera', () => {
  // La primera version lo ensenaba todo de golpe al llegar un fallo, y los
  // pasos que si habian ido bien aparecian terminados en tres milisegundos.
  const { r, avanzar, aplicadas, ultimo } = montar();
  r.recibir({ etapa: 'entrada' });
  r.recibir({ etapa: 'texto', detalle: 'x'.repeat(2000) });
  r.recibir({ etapa: 'respuesta' });
  r.recibir({ etapa: 'error', detalle: 'no paso las cotas' });

  avanzar(100);
  expect(aplicadas).not.toContain('error');

  // Dos mil letras a velocidad de lectura serian mas de veinte segundos; con
  // un error esperando se terminan en PRISA.
  avanzar((PRISA + 0.8) * 1000);
  expect(ultimo()).toHaveLength(2000);
  expect(aplicadas).toEqual(['entrada', 'respuesta', 'error']);
});

test('un reintento empieza un tramo nuevo, sin mezclar los textos', () => {
  const { r, avanzar, aplicadas, visto } = montar();
  r.recibir({ etapa: 'texto', detalle: '{"name":"Primero"}' });
  r.recibir({ etapa: 'reintento', detalle: 'llegaron 0 challenges' });
  r.recibir({ etapa: 'texto', detalle: '{"name":"Segundo"}' });
  avanzar(5000);

  expect(aplicadas).toEqual(['reintento']);
  // Lo ultimo que se ve es solo el segundo borrador, no los dos pegados.
  expect(visto.at(-1)).toBe('{"name":"Segundo"}');
  expect(visto.some((t) => t.includes('Primero') && t.includes('Segundo'))).toBe(false);
});

test('con mucho pendiente acelera, y no se queda mas atras del tope', () => {
  const { r, avanzar, ultimo } = montar();
  const largo = 'x'.repeat(20000);
  r.recibir({ etapa: 'texto', detalle: largo });
  avanzar(RETRASO_MAX * 1000 + 500);
  expect(ultimo().length).toBe(largo.length);
});

test('al cerrar sin fin, avisa cuando termina de ensenar', () => {
  const { r, avanzar } = montar();
  let acabado = false;
  r.recibir({ etapa: 'texto', detalle: TEXTO });
  r.cerrar(() => { acabado = true; });
  expect(acabado).toBe(false);
  avanzar(5000);
  expect(acabado).toBe(true);
});

test('sin animacion se ensenia todo al momento', () => {
  const { r, aplicadas, ultimo } = montar({ inmediato: true });
  r.recibir({ etapa: 'entrada' });
  r.recibir({ etapa: 'texto', detalle: TEXTO });
  expect(ultimo()).toBe(TEXTO);
  expect(aplicadas).toEqual(['entrada']);
});

test('parado no ensenia nada mas', () => {
  const { r, avanzar, visto } = montar();
  r.parar();
  r.recibir({ etapa: 'texto', detalle: TEXTO });
  avanzar(2000);
  expect(visto).toHaveLength(0);
});
