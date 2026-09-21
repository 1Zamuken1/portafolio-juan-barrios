import { RenderMode, ServerRoute } from '@angular/ssr';
import projects from '../assets/data/projects.json';

/**
 * Rutas a prerenderizar. Todas son estaticas, asi que el sitio se publica
 * como HTML plano y los rastreadores que no ejecutan JavaScript (LinkedIn,
 * WhatsApp, Slack) ven los metadatos de cada pagina.
 *
 * El panel /admin se queda en cliente: depende de sesion y del backend.
 */
export const serverRoutes: ServerRoute[] = [
  {
    path: 'projects/:id',
    renderMode: RenderMode.Prerender,
    getPrerenderParams: async () =>
      (projects as Array<{ id: number; status: string }>)
        .filter(p => p.status !== 'Draft')
        .map(p => ({ id: String(p.id) }))
  },
  { path: 'admin/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender }
];
