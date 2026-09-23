import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

/**
 * Los datos de cabecera del perfil viven en un solo sitio.
 *
 * Estaban escritos a mano en seis lugares —dos plantillas, dos componentes, el
 * index y el documento de perfil— así que cambiar el estado laboral era
 * buscar la frase por todo el proyecto y confiar en no dejarse ninguna. No se
 * confió bien: tres se quedaron anunciando que se buscaba una etapa productiva
 * que ya estaba en marcha, durante meses, sin que nada fallara.
 *
 * `estado` está pensado para cambiar —al terminar las prácticas se reescribe
 * esa línea— y por eso importa que no haya copias sueltas.
 */
const RAIZ = join(__dirname, '..');

const perfil = () => JSON.parse(
  readFileSync(join(RAIZ, 'src', 'assets', 'data', 'perfil.json'), 'utf-8'));

function ficheros(dir: string, extensiones: string[]): string[] {
  const salida: string[] = [];
  for (const entrada of readdirSync(dir)) {
    const ruta = join(dir, entrada);
    if (statSync(ruta).isDirectory()) salida.push(...ficheros(ruta, extensiones));
    else if (extensiones.includes(extname(entrada))) salida.push(ruta);
  }
  return salida;
}

test.describe('perfil', () => {

  test('el fichero trae todos los campos que consume la interfaz', () => {
    const p = perfil();
    for (const campo of ['nombre', 'titular', 'especialidad', 'formacion',
                         'ubicacion', 'estado', 'correo', 'github', 'linkedin']) {
      expect(String(p[campo] ?? ''), `falta ${campo} en perfil.json`).not.toBe('');
    }
    expect(typeof p.estadoVisible, 'estadoVisible debe ser booleano').toBe('boolean');
  });

  test('el estado laboral no esta copiado en ninguna plantilla', () => {
    // La copia es el problema, no el texto: mientras exista una, cambiar el
    // JSON deja la interfaz diciendo dos cosas distintas.
    const estado: string = perfil().estado;
    const copias = ficheros(join(RAIZ, 'src', 'app'), ['.html', '.ts'])
      .filter((f) => readFileSync(f, 'utf-8').includes(estado))
      .map((f) => f.slice(RAIZ.length + 1));

    expect(copias,
      `El estado "${estado}" esta escrito a mano en:\n  ${copias.join('\n  ')}\n\n` +
      'Deberia salir de perfil.json, o cambiarlo alli no cambiara esos sitios.')
      .toEqual([]);
  });

  test('el correo y los perfiles tampoco estan copiados', () => {
    const p = perfil();
    const sueltos: string[] = [];

    for (const f of ficheros(join(RAIZ, 'src', 'app'), ['.html', '.ts'])) {
      const texto = readFileSync(f, 'utf-8');
      for (const valor of [p.correo, p.github, p.linkedin]) {
        if (texto.includes(valor)) sueltos.push(`${f.slice(RAIZ.length + 1)}: ${valor}`);
      }
    }

    expect(sueltos,
      `Estos datos de contacto estan escritos a mano:\n  ${sueltos.join('\n  ')}`)
      .toEqual([]);
  });
});
