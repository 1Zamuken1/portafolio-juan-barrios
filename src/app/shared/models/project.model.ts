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
}

