import { Injectable, inject, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, tap } from 'rxjs';
import { Project } from '../../shared/models/project.model';
import { Experience } from '../../shared/models/experience.model';
import { AdminSkill, SkillCategory, Skill } from '../../shared/models/skill.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ═══════════════════════════════════════════
  //  STATIC DATA (JSON from assets — for production mirror)
  // ═══════════════════════════════════════════

  private assetsUrl = '/assets/data';

  getStaticProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.assetsUrl}/projects.json`);
  }

  getStaticExperiences(): Observable<Experience[]> {
    return this.http.get<Experience[]>(`${this.assetsUrl}/experiences.json`);
  }

  getStaticSkills(): Observable<SkillCategory[]> {
    return this.http.get<SkillCategory[]>(`${this.assetsUrl}/skills.json`);
  }

  getStaticSkillsFlat(): Observable<AdminSkill[]> {
    return this.getStaticSkills().pipe(
      tap((categories) => {
        const flat: AdminSkill[] = [];
        let order = 1;
        categories.forEach((cat) => {
          cat.skills.forEach((s) => {
            flat.push({
              id: flat.length + 1,
              name: s.name,
              category: cat.category,
              icon: s.icon ?? '',
              color: s.brandColor ?? cat.color,
              brandColorLight: s.brandColorLight,
              brandColorDark: s.brandColorDark,
              description: s.description ?? '',
              displayOrder: order++
            });
          });
        });
        return flat;
      })
    );
  }

  // ═══════════════════════════════════════════
  //  PROJECTS
  // ═══════════════════════════════════════════

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projects`);
  }

  createProject(project: Project): Observable<Project> {
    return this.http.post<Project>(`${this.apiUrl}/projects`, project);
  }

  updateProject(id: number, project: Project): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/projects/${id}`, project);
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projects/${id}`);
  }

  // ═══════════════════════════════════════════
  //  EXPERIENCES
  // ═══════════════════════════════════════════

  getExperiences(): Observable<Experience[]> {
    return this.http.get<Experience[]>(`${this.apiUrl}/experiences`);
  }

  createExperience(experience: Experience): Observable<Experience> {
    return this.http.post<Experience>(`${this.apiUrl}/experiences`, experience);
  }

  updateExperience(id: number, experience: Experience): Observable<Experience> {
    return this.http.put<Experience>(`${this.apiUrl}/experiences/${id}`, experience);
  }

  deleteExperience(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/experiences/${id}`);
  }

  // ═══════════════════════════════════════════
  //  SKILLS (Admin — flat list from backend)
  // ═══════════════════════════════════════════

  getAdminSkills(): Observable<AdminSkill[]> {
    return this.http.get<AdminSkill[]>(`${this.apiUrl}/skills`);
  }

  createSkill(skill: AdminSkill): Observable<AdminSkill> {
    return this.http.post<AdminSkill>(`${this.apiUrl}/skills`, skill);
  }

  updateSkill(id: number, skill: AdminSkill): Observable<AdminSkill> {
    return this.http.put<AdminSkill>(`${this.apiUrl}/skills/${id}`, skill);
  }

  deleteSkill(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/skills/${id}`);
  }
}
