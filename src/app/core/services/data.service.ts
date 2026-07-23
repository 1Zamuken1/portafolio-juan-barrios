import { Injectable, inject, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap, catchError, map } from 'rxjs';
import { Project } from '../../shared/models/project.model';
import { Experience } from '../../shared/models/experience.model';
import { AdminSkill, SkillsData } from '../../shared/models/skill.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:8080/api';

  /** Cached observables — only one HTTP request per resource */
  private projects$: Observable<Project[]> | null = null;
  private experiences$: Observable<Experience[]> | null = null;
  private adminSkills$: Observable<AdminSkill[]> | null = null;
  private skills$: Observable<SkillsData> | null = null;

  // ═══════════════════════════════════════════
  //  PROJECTS
  // ═══════════════════════════════════════════

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${this.apiUrl}/projects`);
  }

  refreshProjects(): void {
    this.projects$ = null;
  }

  createProject(project: Project): Observable<Project> {
    return this.http.post<Project>(`${this.apiUrl}/projects`, project).pipe(
      tap(() => this.refreshProjects())
    );
  }

  updateProject(id: number, project: Project): Observable<Project> {
    return this.http.put<Project>(`${this.apiUrl}/projects/${id}`, project).pipe(
      tap(() => this.refreshProjects())
    );
  }

  deleteProject(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/projects/${id}`).pipe(
      tap(() => this.refreshProjects())
    );
  }

  // ═══════════════════════════════════════════
  //  EXPERIENCES
  // ═══════════════════════════════════════════

  getExperiences(): Observable<Experience[]> {
    return this.http.get<Experience[]>(`${this.apiUrl}/experiences`);
  }

  refreshExperiences(): void {
    this.experiences$ = null;
  }

  createExperience(experience: Experience): Observable<Experience> {
    return this.http.post<Experience>(`${this.apiUrl}/experiences`, experience).pipe(
      tap(() => this.refreshExperiences())
    );
  }

  updateExperience(id: number, experience: Experience): Observable<Experience> {
    return this.http.put<Experience>(`${this.apiUrl}/experiences/${id}`, experience).pipe(
      tap(() => this.refreshExperiences())
    );
  }

  deleteExperience(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/experiences/${id}`).pipe(
      tap(() => this.refreshExperiences())
    );
  }

  // ═══════════════════════════════════════════
  //  SKILLS (Admin — flat list from backend)
  // ═══════════════════════════════════════════

  getAdminSkills(): Observable<AdminSkill[]> {
    return this.http.get<AdminSkill[]>(`${this.apiUrl}/skills`);
  }

  refreshAdminSkills(): void {
    this.adminSkills$ = null;
  }

  createSkill(skill: AdminSkill): Observable<AdminSkill> {
    return this.http.post<AdminSkill>(`${this.apiUrl}/skills`, skill).pipe(
      tap(() => this.refreshAdminSkills())
    );
  }

  updateSkill(id: number, skill: AdminSkill): Observable<AdminSkill> {
    return this.http.put<AdminSkill>(`${this.apiUrl}/skills/${id}`, skill).pipe(
      tap(() => this.refreshAdminSkills())
    );
  }

  deleteSkill(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/skills/${id}`).pipe(
      tap(() => this.refreshAdminSkills())
    );
  }

  // ═══════════════════════════════════════════
  //  SKILLS (Public — legacy grouped JSON)
  // ═══════════════════════════════════════════

  getSkills(): Observable<SkillsData> {
    if (!this.skills$) {
      this.skills$ = this.http.get<SkillsData>('/assets/data/skills.json').pipe(
        shareReplay(1)
      );
    }
    return this.skills$;
  }
}
