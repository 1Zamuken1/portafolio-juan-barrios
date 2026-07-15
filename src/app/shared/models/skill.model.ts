export interface Skill {
  id: string;
  name: string;
  icon: string;
  brandColor: string;
  brandColorLight?: string;
  brandColorDark?: string;
  description?: string;
}

export interface SkillCategory {
  category: string;
  color: string;
  skills: Skill[];
}

export interface SkillsData {
  [key: string]: SkillCategory;
}
