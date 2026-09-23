import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, catchError, map, throwError } from 'rxjs';
import { leerRepoGithub } from '../../shared/utils/repo-github';

/**
 * Trae el readme de un repositorio publico de GitHub.
 *
 * <p>Va contra la API de GitHub desde el navegador y no a traves del backend,
 * que seria lo habitual. Tres razones, por orden de peso:
 *
 * <ol>
 *   <li>La API de GitHub manda CORS abierto para los repositorios publicos, asi
 *       que el navegador puede leerla sin intermediario.</li>
 *   <li>El limite sin autenticar es de 60 peticiones por hora <b>y por IP</b>.
 *       Desde el backend todas las peticiones saldrian de la misma IP de Render
 *       y se compartirian con cualquier otro servicio alojado ahi; desde el
 *       navegador el limite es de quien las hace.</li>
 *   <li>El readme no es secreto: es el mismo texto que cualquiera ve entrando al
 *       repositorio. Hacerlo pasar por el backend no protege nada.</li>
 * </ol>
 *
 * <p>Solo repositorios publicos: no se manda ningun token, a proposito. Un
 * repositorio privado responde 404, igual que uno que no existe, porque GitHub
 * no confirma la existencia de lo que no puedes ver.
 */
@Injectable({ providedIn: 'root' })
export class ReadmeGithubService {
  private http = inject(HttpClient);

  /**
   * Devuelve el readme en crudo.
   *
   * El texto se parsea con {@link leerRepoGithub}, que solo acepta github.com y
   * devuelve owner y repo por separado. La URL de la API se construye aqui con
   * esas dos piezas: nada de lo que se pega en el campo llega a formar parte del
   * host consultado.
   */
  traerReadme(enlace: string): Observable<string> {
    const repo = leerRepoGithub(enlace);
    if (!repo) {
      return throwError(() => new Error(
        'Eso no parece un repositorio de GitHub. Pega la URL del repositorio ' +
        '(https://github.com/usuario/repo) o escribe usuario/repo.'));
    }

    const url = `https://api.github.com/repos/${encodeURIComponent(repo.owner)}`
      + `/${encodeURIComponent(repo.repo)}/readme`;

    return this.http
      .get(url, {
        // Sin esta cabecera la API devuelve un JSON con el contenido en base64.
        // Pidiendo el crudo llega el markdown tal cual y no hay que decodificar.
        headers: { Accept: 'application/vnd.github.raw' },
        responseType: 'text'
      })
      .pipe(
        map((texto) => texto ?? ''),
        catchError((e: HttpErrorResponse) => throwError(() => new Error(explicar(e, repo))))
      );
  }
}

/**
 * Traduce el fallo a algo sobre lo que se pueda actuar.
 *
 * El error de una API sin explicar es lo que costo una hora de busqueda con el
 * 404 de un modelo retirado de Groq. Cada caso de aqui dice, ademas de que
 * paso, que hacer: reintentar, esperar, o pegar el readme a mano.
 */
function explicar(e: HttpErrorResponse, repo: { owner: string; repo: string }): string {
  const nombre = `${repo.owner}/${repo.repo}`;

  if (e.status === 404) {
    return `No se encontro un readme en ${nombre}. O el repositorio es privado, `
      + 'o no tiene readme, o el nombre esta mal escrito. Si es privado, pega el '
      + 'texto a mano: esto no manda ningun token.';
  }
  if (e.status === 403 || e.status === 429) {
    return 'GitHub ha cortado por limite de peticiones (60 por hora sin '
      + 'autenticar). Se restablece solo en menos de una hora; mientras tanto, '
      + 'pega el readme a mano.';
  }
  if (e.status === 0) {
    return 'No se pudo contactar con GitHub. Puede ser la conexion o algo que '
      + 'bloquee la peticion en el navegador.';
  }
  return `GitHub respondio ${e.status} al pedir el readme de ${nombre}.`;
}
