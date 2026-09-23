import { test, expect } from '@playwright/test';
import { esNuestroBackend } from '../src/app/shared/utils/nuestro-backend';

/**
 * A qué peticiones se les pega el token de administración.
 *
 * Esto existe por un fallo concreto: el interceptor ponía la cabecera en todas
 * las peticiones de HttpClient sin mirar el destino. Mientras la única salida
 * fue el propio backend no se notó, pero al añadir la que trae el readme de
 * GitHub el token de admin empezó a viajar a api.github.com.
 *
 * El caso que de verdad importa es el segundo bloque: los destinos que NO deben
 * llevarlo. El primero solo comprueba que la corrección no rompió lo que ya
 * funcionaba.
 *
 * Corre sin navegador; `ng test` no tiene target en angular.json.
 */
test.describe('esNuestroBackend', () => {

  test('reconoce el backend propio', () => {
    expect(esNuestroBackend('http://localhost:8080/api/projects')).toBe(true);
    expect(esNuestroBackend('http://localhost:8080/api/projects/draft/stream')).toBe(true);
    expect(esNuestroBackend('http://localhost:8080/api/auth/login')).toBe(true);
  });

  test('no manda el token a terceros', () => {
    expect(esNuestroBackend('https://api.github.com/repos/usuario/repo/readme')).toBe(false);
    expect(esNuestroBackend('https://raw.githubusercontent.com/usuario/repo/main/README.md')).toBe(false);
    expect(esNuestroBackend('https://api.groq.com/openai/v1/models')).toBe(false);
  });

  test('no se deja engañar por una URL que contenga la del backend', () => {
    // Comparar con startsWith sobre la cadena habría dejado pasar estos.
    expect(esNuestroBackend('https://evil.example/?x=http://localhost:8080/api')).toBe(false);
    expect(esNuestroBackend('http://localhost:8080.evil.example/api/projects')).toBe(false);
  });

  test('otro puerto del mismo host tampoco es el backend', () => {
    // En desarrollo conviven el servidor de Angular y el de Spring; son
    // orígenes distintos aunque compartan el host.
    expect(esNuestroBackend('http://localhost:4200/api/projects')).toBe(false);
  });

  test('una ruta fuera de /api del mismo servidor no lleva token', () => {
    expect(esNuestroBackend('http://localhost:8080/actuator/health')).toBe(false);
  });
});
