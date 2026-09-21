import { Injectable, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { environment } from '../../../environments/environment';

export interface SeoConfig {
  /** Titulo de la pestana. Se le anade el sufijo del sitio salvo en la portada. */
  title: string;
  description: string;
  /** Ruta absoluta del sitio, empezando por barra. Ej: '/projects/1'. */
  path: string;
  /** Ruta de la imagen para compartir. Relativa o absoluta. */
  image?: string;
  type?: 'website' | 'article' | 'profile';
}

const SITE_NAME = 'Juan Esteban Barrios';
const DEFAULT_IMAGE = '/assets/images/hero/profile.jpg';

/**
 * Centraliza titulo, descripcion, canonical, Open Graph, Twitter Card y
 * datos estructurados.
 *
 * Sin esto todas las rutas compartian el mismo titulo y la misma descripcion,
 * asi que los cuatro casos de estudio competian entre si en los buscadores y
 * se veian identicos al compartirlos.
 */
@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly document = inject(DOCUMENT);

  private static readonly JSON_LD_ID = 'seo-json-ld';

  update(config: SeoConfig): void {
    const url = this.absolute(config.path);
    const image = this.absolute(config.image ?? DEFAULT_IMAGE);
    const fullTitle = config.path === '/'
      ? config.title
      : `${config.title} | ${SITE_NAME}`;

    this.title.setTitle(fullTitle);

    this.setNamed('description', config.description);
    this.setProperty('og:title', fullTitle);
    this.setProperty('og:description', config.description);
    this.setProperty('og:url', url);
    this.setProperty('og:image', image);
    this.setProperty('og:type', config.type ?? 'website');
    this.setProperty('og:site_name', SITE_NAME);
    this.setProperty('og:locale', 'es_CO');

    this.setNamed('twitter:card', 'summary_large_image');
    this.setNamed('twitter:title', fullTitle);
    this.setNamed('twitter:description', config.description);
    this.setNamed('twitter:image', image);

    this.setCanonical(url);
  }

  /** Inserta o reemplaza el bloque JSON-LD de la pagina. */
  setStructuredData(data: Record<string, unknown>): void {
    const head = this.document.head;
    const previo = this.document.getElementById(SeoService.JSON_LD_ID);
    if (previo) previo.remove();

    const script = this.document.createElement('script');
    script.id = SeoService.JSON_LD_ID;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    head.appendChild(script);
  }

  /** Convierte una ruta del sitio en URL absoluta para canonical y Open Graph. */
  absolute(path: string): string {
    if (/^https?:\/\//i.test(path)) return path;
    const base = environment.siteUrl.replace(/\/$/, '');
    return `${base}${path.startsWith('/') ? path : `/${path}`}`;
  }

  private setNamed(name: string, content: string): void {
    this.meta.updateTag({ name, content });
  }

  private setProperty(property: string, content: string): void {
    this.meta.updateTag({ property, content }, `property='${property}'`);
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }
}
