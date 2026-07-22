/** Frontend Skill model matching the backend domain entity */
export interface AdminSkill {
  id: number;
  name: string;
  category: string;
  icon: string;
  color: string;
  displayOrder: number;
}

/** Legacy frontend models used by the public-facing About section (from static JSON) */
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
