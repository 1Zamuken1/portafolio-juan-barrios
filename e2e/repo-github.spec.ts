import { test, expect } from '@playwright/test';
import { leerRepoGithub } from '../src/app/shared/utils/repo-github';

/**
 * El parser del enlace de repositorio.
 *
 * No es una comodidad: es lo que decide a qué host se le va a pedir el readme.
 * El campo acepta texto libre, así que aquí están tanto las formas que la gente
 * escribe de verdad como las que no deben pasar.
 *
 * Corre sin navegador, como limpiar-vacios.spec.ts: `ng test` no tiene target
 * en angular.json y las funciones puras se prueban desde aquí.
 */
test.describe('leerRepoGithub', () => {

  test('lee la URL del repositorio', () => {
    expect(leerRepoGithub('https://github.com/1Zamuken1/portafolio-juan-barrios'))
      .toEqual({ owner: '1Zamuken1', repo: 'portafolio-juan-barrios' });
  });

  test('lee la URL de una pagina dentro del repositorio', () => {
    // Copiar la URL de la barra estando dentro de un fichero es lo normal.
    expect(leerRepoGithub('https://github.com/usuario/repo/blob/main/README.md'))
      .toEqual({ owner: 'usuario', repo: 'repo' });
    expect(leerRepoGithub('https://github.com/usuario/repo/tree/develop'))
      .toEqual({ owner: 'usuario', repo: 'repo' });
  });

  test('quita el .git del enlace de clonado', () => {
    expect(leerRepoGithub('https://github.com/usuario/repo.git'))
      .toEqual({ owner: 'usuario', repo: 'repo' });
  });

  test('acepta la forma corta y la que no lleva protocolo', () => {
    expect(leerRepoGithub('usuario/repo')).toEqual({ owner: 'usuario', repo: 'repo' });
    expect(leerRepoGithub('github.com/usuario/repo')).toEqual({ owner: 'usuario', repo: 'repo' });
    expect(leerRepoGithub('  usuario/repo  ')).toEqual({ owner: 'usuario', repo: 'repo' });
  });

  test('tolera la barra final y el query', () => {
    expect(leerRepoGithub('https://github.com/usuario/repo/')).toEqual({ owner: 'usuario', repo: 'repo' });
    expect(leerRepoGithub('https://github.com/usuario/repo?tab=readme-ov-file'))
      .toEqual({ owner: 'usuario', repo: 'repo' });
  });

  test('rechaza cualquier host que no sea github.com', () => {
    // El motivo de que esto sea una función aparte: si el host saliera del
    // texto pegado, un enlace a otro dominio se convertiría en una petición a
    // ese dominio.
    expect(leerRepoGithub('https://gitlab.com/usuario/repo')).toBeNull();
    expect(leerRepoGithub('https://raw.githubusercontent.com/usuario/repo/main/README.md')).toBeNull();
    expect(leerRepoGithub('https://gist.github.com/usuario/abc123')).toBeNull();
    expect(leerRepoGithub('http://evil.example/github.com/usuario/repo')).toBeNull();
  });

  test('no se deja engañar por github.com dentro de otra URL', () => {
    // Comparar cadenas en vez del host ya parseado habría dejado pasar estos.
    expect(leerRepoGithub('https://evil.example/?x=github.com/usuario/repo')).toBeNull();
    expect(leerRepoGithub('https://github.com.evil.example/usuario/repo')).toBeNull();
  });

  test('rechaza segmentos que no son nombres de repositorio', () => {
    expect(leerRepoGithub('https://github.com/usuario')).toBeNull();
    expect(leerRepoGithub('https://github.com/')).toBeNull();
    expect(leerRepoGithub('../../etc/passwd')).toBeNull();
    expect(leerRepoGithub('')).toBeNull();
    expect(leerRepoGithub('   ')).toBeNull();
  });
});
