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
    live: string | null;
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
