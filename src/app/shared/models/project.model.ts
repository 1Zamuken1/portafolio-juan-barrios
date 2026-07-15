export interface Project {
  id: number;
  name: string;
  slug: string;
  type: string;
  shortDescription: string;
  fullDescription: string;
  image: string;
  technologies: string[];
  features: string[];
  role: string;
  year: number;
  status: 'Draft' | 'Active Development' | 'Completed' | 'Production' | 'Published';
  links: {
    github: string;
    live: string | null;
    documentation: string | null;
  };
  highlights: string[];
  keywords: string[];
  metrics?: Record<string, any>;
}
