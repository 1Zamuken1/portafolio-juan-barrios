/**
 * Lee un enlace de GitHub y saca de el owner/repo.
 *
 * Existe aparte del servicio, y como funcion pura, por dos motivos. El primero
 * es que se puede probar sin red. El segundo importa mas: aqui es donde se
 * decide que host se va a consultar, y esa decision no debe depender de lo que
 * pegue quien rellena el formulario.
 *
 * El campo pide "un enlace de GitHub", pero lo que se pega en un campo de texto
 * puede ser cualquier cosa. Si se construyera la URL de la API concatenando el
 * texto a ciegas, un enlace a otro dominio acabaria siendo una peticion a ese
 * dominio con las cabeceras de esta aplicacion. Por eso esto solo acepta
 * github.com y devuelve las dos piezas ya separadas: quien llama no recibe una
 * URL, recibe un owner y un repo con los que construir la suya.
 */

/** Las dos piezas que identifican un repositorio. */
export interface RepoGithub {
  owner: string;
  repo: string;
}

/** Los unicos hosts que se aceptan. Sin subdominios: nada de `raw.` ni `gist.`. */
const HOSTS = new Set(['github.com', 'www.github.com']);

/**
 * Un segmento valido de owner o de repo.
 *
 * GitHub admite letras, numeros, guion, guion bajo y punto. No admite barras ni
 * dos puntos, que es lo que haria falta para salirse de la ruta construida.
 */
const SEGMENTO = /^[A-Za-z0-9._-]+$/;

/**
 * Devuelve el repositorio, o `null` si el texto no identifica uno en github.com.
 *
 * Acepta la URL del repositorio, la de cualquier pagina dentro de el (un
 * `/tree/main`, un fichero suelto) y la forma corta `owner/repo`, que es lo que
 * la gente escribe cuando no le apetece ir a copiar la URL.
 */
export function leerRepoGithub(texto: string): RepoGithub | null {
  const limpio = (texto ?? '').trim();
  if (!limpio) return null;

  // La forma corta no es una URL, asi que se resuelve antes de intentar
  // parsearla: `new URL('owner/repo')` no falla de forma util, lanza.
  if (!limpio.includes('://') && !limpio.startsWith('github.com')) {
    return desdeSegmentos(limpio.split('/'));
  }

  let url: URL;
  try {
    url = new URL(limpio.includes('://') ? limpio : `https://${limpio}`);
  } catch {
    return null;
  }

  // La comprobacion es sobre el host ya parseado, no sobre el texto. Un
  // `https://otrositio.com/?x=github.com/a/b` contiene la cadena pero su host
  // es otro; comparar textos habria dejado pasar ese.
  if (!HOSTS.has(url.hostname.toLowerCase())) return null;

  return desdeSegmentos(url.pathname.split('/'));
}

/** Toma los dos primeros segmentos no vacios y los valida. */
function desdeSegmentos(partes: string[]): RepoGithub | null {
  const utiles = partes.filter((p) => p.length > 0);
  if (utiles.length < 2) return null;

  const owner = utiles[0];
  // La URL de un repositorio se puede copiar con el `.git` del clonado pegado
  // al final; no es parte del nombre.
  const repo = utiles[1].replace(/\.git$/i, '');

  if (!SEGMENTO.test(owner) || !SEGMENTO.test(repo)) return null;
  // `.` y `..` pasan el patron de caracteres pero no son nombres de nada.
  if (/^\.+$/.test(owner) || /^\.+$/.test(repo)) return null;

  return { owner, repo };
}
