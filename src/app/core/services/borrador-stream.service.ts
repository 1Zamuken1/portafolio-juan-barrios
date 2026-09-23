import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';
import { ProjectDraft } from '../../shared/models/project.model';

/** Las claves que manda el backend. Son estables: la interfaz decide por ellas. */
export type EtapaClave =
  | 'entrada'
  | 'modelo'
  /** Un trozo del texto que esta escribiendo el modelo, tal cual llega. */
  | 'texto'
  | 'respuesta'
  | 'parseo'
  | 'validacion'
  | 'fin'
  | 'error';

/** Una linea del stream. */
export interface LineaPipeline {
  etapa: EtapaClave;
  detalle?: string;
  /** Solo en 'error'. Distingue lo que se reintenta de lo que solo se espera. */
  tipo?: 'invalido' | 'nodisponible' | 'inesperado';
  /** Solo en 'fin'. */
  borrador?: ProjectDraft;
}

/**
 * Lee el borrador mientras se redacta, en vez de esperar a que termine.
 *
 * <p>No usa HttpClient: Angular entrega la respuesta entera cuando ha llegado
 * toda, y aqui lo que hace falta es ir leyendola. Con fetch se puede recorrer el
 * cuerpo segun llega. Tampoco usa EventSource, que seria lo natural para SSE,
 * porque EventSource solo hace GET y el readme va en el cuerpo; meterlo en la
 * URL seria mandar miles de caracteres por el query.
 *
 * <p>Al salirse de HttpClient se sale tambien del interceptor, asi que la
 * cabecera del token se pone aqui a mano. Es el motivo de que el endpoint tenga
 * su propia prueba de que no se puede llamar sin autenticar: cada llamada gasta
 * cuota de pago.
 */
@Injectable({ providedIn: 'root' })
export class BorradorStreamService {
  private auth = inject(AuthService);

  redactar(name: string, readme: string): Observable<LineaPipeline> {
    return new Observable<LineaPipeline>((observador) => {
      // Cancelar de verdad al desuscribirse: si se cierra el panel a medias, la
      // peticion se corta en vez de seguir ocupando un hilo del servidor hasta
      // que el modelo conteste.
      const corte = new AbortController();

      const token = this.auth.getToken();
      const cabeceras: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) cabeceras['Authorization'] = `Bearer ${token}`;

      fetch(`${environment.apiUrl}/projects/draft/stream`, {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify({ name, readme }),
        signal: corte.signal
      })
        .then(async (respuesta) => {
          // Un 401 o un 403 si llegan como estado, porque ocurren antes de que
          // el cuerpo empiece. Lo que falla despues ya no puede cambiar el
          // estado y viaja como una linea de tipo 'error'.
          if (!respuesta.ok || !respuesta.body) {
            throw new Error(
              respuesta.status === 401 || respuesta.status === 403
                ? 'La sesion ha caducado. Vuelve a entrar.'
                : `El backend respondio ${respuesta.status}.`);
          }

          const lector = respuesta.body.getReader();
          const decodificador = new TextDecoder();
          let pendiente = '';

          for (;;) {
            const { done, value } = await lector.read();
            if (done) break;

            // stream: true porque un caracter multibyte puede quedar partido
            // entre dos trozos; sin eso, una tilde en mitad del corte sale mal.
            pendiente += decodificador.decode(value, { stream: true });

            const lineas = pendiente.split('\n');
            // La ultima puede estar a medias: se guarda para el siguiente trozo.
            pendiente = lineas.pop() ?? '';

            for (const linea of lineas) {
              const limpia = linea.trim();
              if (limpia) observador.next(JSON.parse(limpia) as LineaPipeline);
            }
          }

          if (pendiente.trim()) {
            observador.next(JSON.parse(pendiente.trim()) as LineaPipeline);
          }
          observador.complete();
        })
        .catch((e: unknown) => {
          // Abortar es una salida normal, no un fallo que contar.
          if (e instanceof DOMException && e.name === 'AbortError') return;
          observador.error(e instanceof Error ? e : new Error(String(e)));
        });

      return () => corte.abort();
    });
  }
}
