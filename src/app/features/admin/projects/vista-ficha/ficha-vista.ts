import { BlueprintEdge, BlueprintLayout, BlueprintNode, ProjectDraft } from '../../../../shared/models/project.model';

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
  features?: string[];
  highlights?: string[];
  keywords?: string[];
  coreArchitecture?: string;
  databaseArchitecture?: string;
  aiArchitecture?: string;
  github?: string;
  /** El stack por capas y las caracteristicas por grupos. */
  stack?: Record<string, string[]>;
  grupos?: Record<string, string[]>;
  /** Las piezas del diagrama segun van llegando: solo el nombre y la capa. */
  piezas?: { label?: string; group?: string }[];
  /** El diagrama entero, cuando ya esta colocado. Mientras se escribe no lo
   *  esta: las coordenadas las pone el backend al final. */
  diagrama?: { nodes: BlueprintNode[]; edges: BlueprintEdge[]; layout?: BlueprintLayout };
}

/** Las tres listas del borrador. */
export type ListaFicha = 'features' | 'highlights' | 'keywords';

/** Los tres resumenes de arquitectura, con el rotulo con que salen en la ficha. */
export const ARQUITECTURA: ReadonlyArray<{ clave: 'coreArchitecture' | 'databaseArchitecture' | 'aiArchitecture'; titulo: string }> = [
  { clave: 'coreArchitecture', titulo: 'Arquitectura' },
  { clave: 'databaseArchitecture', titulo: 'Base de datos' },
  { clave: 'aiArchitecture', titulo: 'IA' }
];

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

  for (const clave of ['features', 'highlights', 'keywords'] as const) {
    const l = valor[clave];
    if (Array.isArray(l)) ficha[clave] = l.filter((x): x is string => typeof x === 'string');
  }
  for (const { clave } of ARQUITECTURA) {
    const t = cadena(valor[clave]);
    if (t !== undefined) ficha[clave] = t;
  }

  const links = valor['links'];
  if (esObjeto(links)) {
    const g = cadena(links['github']);
    if (g !== undefined) ficha.github = g;
  }

  const porGrupos = (v: unknown): Record<string, string[]> | undefined => {
    if (!esObjeto(v)) return undefined;
    return Object.fromEntries(Object.entries(v).map(([k, l]) =>
      [k, Array.isArray(l) ? l.filter((x): x is string => typeof x === 'string') : []]));
  };
  const stack = porGrupos(valor['structuredStack']);
  if (stack) ficha.stack = stack;
  const grupos = porGrupos(valor['structuredFeatures']);
  if (grupos) ficha.grupos = grupos;

  const nodos = valor['architectureNodes'];
  if (Array.isArray(nodos)) {
    ficha.piezas = nodos.filter(esObjeto).map((n) => ({ label: cadena(n['label']), group: cadena(n['group']) }));
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
    challenges: b.challenges.map((c) => ({ ...c })),
    features: [...(b.features ?? [])],
    highlights: [...(b.highlights ?? [])],
    keywords: [...(b.keywords ?? [])],
    coreArchitecture: b.coreArchitecture ?? '',
    databaseArchitecture: b.databaseArchitecture ?? '',
    aiArchitecture: b.aiArchitecture ?? '',
    github: b.links?.github ?? '',
    stack: { ...(b.structuredStack ?? {}) },
    grupos: { ...(b.structuredFeatures ?? {}) },
    piezas: (b.architectureNodes ?? []).map((n) => ({ label: n.label, group: n.group })),
    diagrama: b.architectureNodes?.length
      ? { nodes: b.architectureNodes, edges: b.architectureEdges ?? [], layout: b.architectureLayout }
      : undefined
  };
}

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function cadena(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
