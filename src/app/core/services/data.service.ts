import { Injectable, inject, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { Project } from '../../shared/models/project.model';
import { SkillsData } from '../../shared/models/skill.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  private apiUrl = isDevMode() ? 'http://localhost:8080/api' : '/api';

  /** Cached observables — only one HTTP request per resource */
  private projects$: Observable<Project[]> | null = null;
  private skills$: Observable<SkillsData> | null = null;

  getProjects(): Observable<Project[]> {
    if (!this.projects$) {
      this.projects$ = this.http.get<Project[]>(`${this.apiUrl}/projects`).pipe(
        shareReplay(1)
      );
    }
    return this.projects$;
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

  getSkills(): Observable<SkillsData> {
    if (!this.skills$) {
      this.skills$ = this.http.get<SkillsData>('/assets/data/skills.json').pipe(
        shareReplay(1)
      );
    }
    return this.skills$;
  }
}
