import { environment } from '../../../environments/environment';

/**
 * Decide si una URL es del backend de este portafolio.
 *
 * Existe porque el interceptor del JWT pegaba la cabecera a <b>todas</b> las
 * peticiones de HttpClient, sin mirar a donde iban. Mientras la unica salida fue
 * el propio backend eso no se notaba, pero en cuanto se anadio la que trae el
 * readme de GitHub, el token de administracion empezo a salir hacia
 * api.github.com. No es un riesgo teorico: es una credencial mandada a un
 * tercero que no la pidio.
 *
 * La regla es la contraria a la que habia: la cabecera se pone solo donde sirve
 * de algo, y todo lo demas sale limpio. Asi la proxima llamada a un servicio
 * externo no hereda el problema.
 *
 * Vive aqui, y no dentro del interceptor, para poder probarla sin arrancar
 * Angular: importar el interceptor arrastra AuthService y con el todo el
 * runtime.
 */
export function esNuestroBackend(url: string): boolean {
  const base = environment.apiUrl;

  // Las rutas relativas no salen del origen del sitio.
  if (base.startsWith('/')) return url.startsWith(base);

  try {
    const destino = new URL(url, base);
    const backend = new URL(base);
    // Se comparan origen y ruta ya parseados, no cadenas: un
    // https://otro.example/?x=http://backend/api empieza por otra cosa pero
    // contiene el texto, y comparar con startsWith dejaria pasar el que no es.
    return destino.origin === backend.origin
      && destino.pathname.startsWith(backend.pathname);
  } catch {
    return false;
  }
}
