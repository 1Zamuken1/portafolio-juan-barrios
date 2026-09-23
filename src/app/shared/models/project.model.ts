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
}

export type { BlueprintNode, BlueprintEdge, BlueprintLayout };
