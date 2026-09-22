import { test, expect } from '@playwright/test';
import { limpiarVacios } from '../src/app/shared/utils/limpiar-vacios';

/**
 * Lo que el formulario del panel envía a la API.
 *
 * El backend hace una actualización parcial: lo que no llega se conserva. Eso
 * solo protege si lo vacío no viaja, así que estas reglas son la mitad del
 * mecanismo que impidió perder el contenido una tercera vez.
 *
 * Estos tests corren sin navegador. Angular no tiene runner de unitarios en
 * este proyecto (`ng test` no tiene target en angular.json), así que las
 * funciones puras se prueban desde aquí.
 */
test.describe('limpiarVacios', () => {

  test('quita cadenas, nulos y listas vacias del primer nivel', () => {
    expect(limpiarVacios({
      name: 'Gastu',
      role: '',
      imageUrl: null,
      features: []
    })).toEqual({ name: 'Gastu' });
  });

  /**
   * El fallo real. La primera version solo miraba el primer nivel, asi que
   * links pasaba entero con sus dos cadenas vacias dentro. Se guardo
   * `"live": ""` en un proyecto donde ese campo no existia, y de ahi habria
   * pasado a projects.json en el siguiente mirror:pull.
   */
  test('un grupo anidado enteramente vacio no se envia', () => {
    expect(limpiarVacios({
      name: 'prueba',
      links: { github: '', live: '' }
    })).toEqual({ name: 'prueba' });
  });

  test('de un grupo a medias solo viaja lo que tiene valor', () => {
    // Sin esto, guardar SGVA --que no tiene despliegue-- escribiria
    // "live": "" donde antes no habia nada.
    expect(limpiarVacios({
      links: { github: 'https://github.com/1Zamuken1/SGVA-Assistant', live: '' }
    })).toEqual({
      links: { github: 'https://github.com/1Zamuken1/SGVA-Assistant' }
    });
  });

  test('un grupo con todo relleno se deja intacto', () => {
    const readme = {
      objective: 'Centralizar el control de las finanzas.',
      architecture: 'Django con apps por dominio.',
      mainFeatures: 'Registro de movimientos.',
      technologies: 'Django y PostgreSQL.',
      learnings: 'La separacion simplifico las pruebas.'
    };
    expect(limpiarVacios({ readmeMarkdown: readme })).toEqual({ readmeMarkdown: readme });
  });

  test('no entra dentro de los elementos de una lista', () => {
    // Un desafio al que le falte la descripcion se envia tal cual y decide el
    // backend. Limpiarlo por dentro lo dejaria a medias, que es peor.
    const challenges = [
      { title: 'Autenticacion hibrida', description: 'Unificar perfiles sin conflictos.' },
      { title: 'Solo titulo', description: '' }
    ];
    expect(limpiarVacios({ challenges })).toEqual({ challenges });
  });

  test('un objeto entero vacio devuelve undefined en vez de {}', () => {
    expect(limpiarVacios({ a: '', b: { c: null } })).toBeUndefined();
  });

  test('los ceros y los false no son vacio', () => {
    // displayOrder 0 es una posicion valida, no un hueco. Si se quitara, el
    // proyecto saltaria al final de la lista al guardarlo.
    expect(limpiarVacios({ displayOrder: 0, year: 2026, activo: false }))
      .toEqual({ displayOrder: 0, year: 2026, activo: false });
  });
});
