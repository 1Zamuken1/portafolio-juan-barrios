import { ProjectDraft } from '../../../../shared/models/project.model';

/**
 * Lo que dibuja la vista previa: la parte de la ficha que redacta la IA, con
 * todo opcional porque mientras el modelo escribe cualquier campo puede no
 * haber llegado todavia.
 */
export interface FichaVista {
  name?: string;
  shortDescription?: string;
  fullDescription?: string;
  readmeMarkdown?: Partial<Record<SeccionCaso, string>>;
  challenges?: { title?: string; description?: string }[];
}

export type SeccionCaso = 'objective' | 'architecture' | 'mainFeatures' | 'technologies' | 'learnings';

/**
 * Las cinco secciones del caso de estudio, con el titulo con que las dibuja la
 * ficha publica. En el mismo orden que alli, para que la vista previa se lea
 * igual que lo que se va a publicar.
 */
export const SECCIONES_CASO: ReadonlyArray<{ clave: SeccionCaso; titulo: string }> = [
  { clave: 'objective', titulo: 'Descripción' },
  { clave: 'architecture', titulo: 'Arquitectura' },
  { clave: 'mainFeatures', titulo: 'Funcionalidades principales' },
  { clave: 'technologies', titulo: 'Tecnologías' },
  { clave: 'learnings', titulo: 'Aprendizajes' }
];

/** Lo que no depende de la IA pero da contexto a la cabecera. */
export interface MetaFicha {
  slug?: string;
  type?: string;
  status?: string;
  year?: number;
}

/**
 * Pasa lo que sale del lector de JSON parcial a una ficha que se pueda dibujar.
 *
 * Solo se queda con cadenas. Lo que llega es la salida de un modelo a medias:
 * si en un campo de texto aparece un numero o un objeto, se ignora en vez de
 * pintarlo como "[object Object]".
 */
export function aFichaVista(valor: unknown): FichaVista {
  if (!esObjeto(valor)) return {};

  const ficha: FichaVista = {
    name: cadena(valor['name']),
    shortDescription: cadena(valor['shortDescription']),
    fullDescription: cadena(valor['fullDescription'])
  };

  const rm = valor['readmeMarkdown'];
  if (esObjeto(rm)) {
    ficha.readmeMarkdown = {};
    for (const { clave } of SECCIONES_CASO) {
      const texto = cadena(rm[clave]);
      if (texto !== undefined) ficha.readmeMarkdown[clave] = texto;
    }
  }

  const lista = valor['challenges'];
  if (Array.isArray(lista)) {
    ficha.challenges = lista.filter(esObjeto).map((c) => ({
      title: cadena(c['title']),
      description: cadena(c['description'])
    }));
  }

  return ficha;
}

/** El borrador terminado, dicho como ficha. */
export function fichaDeBorrador(b: ProjectDraft): FichaVista {
  return {
    name: b.name,
    shortDescription: b.shortDescription,
    fullDescription: b.fullDescription,
    readmeMarkdown: { ...b.readmeMarkdown },
    challenges: b.challenges.map((c) => ({ ...c }))
  };
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cadena(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
