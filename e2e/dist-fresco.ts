import { existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Si el build de dist/ es anterior a los datos.
 *
 * prerender.spec y sitemap.spec leen el HTML que dejo el ultimo build, sin
 * construir nada. Con un dist viejo fallaban diciendo que el sitemap no
 * cuadraba, cuando lo que no cuadraba era el build: paso al retirar un
 * proyecto del JSON. CI construye antes de probar, asi que alli no pasa.
 */
export function distDesactualizado(dist: string, raiz: string): string | null {
  const indice = join(dist, 'index.html');
  if (!existsSync(indice)) return null;
  const construido = statSync(indice).mtimeMs;

  const datos = join(raiz, 'src', 'assets', 'data');
  const cambiado = readdirSync(datos)
    .filter((f) => f.endsWith('.json'))
    .map((f) => ({ f, t: statSync(join(datos, f)).mtimeMs }))
    .find((x) => x.t > construido);

  return cambiado
    ? `dist/ es anterior a ${cambiado.f}: ejecuta pnpm run build antes de estas pruebas.`
    : null;
}
