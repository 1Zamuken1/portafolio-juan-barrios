export interface Project {
  id: number;
  name: string;
  shortDescription: string;
  fullDescription: string;
  role: string;
  year: number;
  status: string;
  technologies: string[];
  features: string[];
  highlights: string[];
  githubUrl: string;
  liveUrl: string | null;
  imageUrl: string | null;
  displayOrder: number;
}

