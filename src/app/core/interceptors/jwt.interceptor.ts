import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { esNuestroBackend } from '../../shared/utils/nuestro-backend';

/**
 * Pone el token de administracion, y solo donde sirve de algo.
 *
 * Antes lo ponia en todas las peticiones sin mirar el destino; ver
 * {@link esNuestroBackend}, que es donde esta el motivo y las pruebas.
 */
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  if (token && esNuestroBackend(req.url)) {
    const authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
    return next(authReq);
  }

  return next(req);
};
