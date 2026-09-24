import { BlueprintNode, BlueprintEdge, BlueprintLayout } from './blueprint.model';

export interface Project {
  id: number;
  name: string;
  shortDescription: string;
  fullDescription: string;
  role: string;
  year: number;
  status: string;
  technologies: string[];
  keywords: string[];
  features: string[];
  highlights: string[];
  links: {
    github: string;
    /** El proyecto funcionando. La mayoria no lo tiene: son de clonar y desplegar. */
    live?: string | null;
    /** Ejecutable publicado, para las aplicaciones de escritorio. La ficha lo
     *  muestra solo cuando no hay `live`. */
    download?: string | null;
  };
  githubUrl?: string; // Legacy
  liveUrl?: string | null; // Legacy
  imageUrl: string | null;
  displayOrder: number;
  slug?: string;
  type?: string;
  metrics?: any;
  techStack?: { name: string; icon: string }[];

  // Advanced Case Study Fields
  teamSize?: number;
  coreArchitecture?: string;
  databaseArchitecture?: string;
  aiArchitecture?: string;
  readmeMarkdown?: {
    objective: string;
    architecture: string;
    mainFeatures: string;
    technologies: string;
    learnings: string;
  };
  structuredStack?: Record<string, string[]>;
  structuredFeatures?: Record<string, string[]>;
  rawMetrics?: Record<string, string | number>;
  architectureNodes?: BlueprintNode[];
  architectureEdges?: BlueprintEdge[];
  architectureLayout?: BlueprintLayout;
  challenges?: { title: string; description: string }[];
}

/**
 * Borrador redactado a partir de un readme. Solo prosa.
 *
 * No incluye techStack, structuredStack, structuredFeatures ni rawMetrics a
 * proposito: las claves de esos campos ya son inconsistentes entre proyectos y
 * los iconos son clases devicon concretas, que un modelo no puede adivinar.
 * Un borrador nunca se guarda solo: rellena el formulario y la persona decide.
 */
export interface ProjectDraft {
  /** Lo redacta la IA. Antes habia que escribirlo a mano antes de poder pedir
   *  el borrador, y era un paso manual delante del automatico para un dato que
   *  casi siempre esta ya en el readme. */
  name: string;
  shortDescription: string;
  fullDescription: string;
  readmeMarkdown: {
    objective: string;
    architecture: string;
    mainFeatures: string;
    technologies: string;
    learnings: string;
  };
  challenges: { title: string; description: string }[];
  /** Las listas y los resumenes de arquitectura. Opcionales: vacios quieren
   *  decir que el readme no lo dice, y entonces el formulario no se toca. */
  features?: string[];
  highlights?: string[];
  keywords?: string[];
  coreArchitecture?: string;
  databaseArchitecture?: string;
  aiArchitecture?: string;
  /** Solo el repositorio, y solo si esta escrito en el readme: el backend
   *  tira el que no encuentra en el texto. */
  links?: { github?: string };
  /** El diagrama, ya colocado por el backend. Sin nodos, no hay diagrama. */
  architectureNodes?: BlueprintNode[];
  architectureEdges?: BlueprintEdge[];
  architectureLayout?: BlueprintLayout;
  /** El stack por capas y las caracteristicas por grupos, ya en el
   *  vocabulario de src/assets/data/vocabulario.json. */
  structuredStack?: Record<string, string[]>;
  structuredFeatures?: Record<string, string[]>;
}

export type { BlueprintNode, BlueprintEdge, BlueprintLayout };
