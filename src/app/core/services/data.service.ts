import { Injectable, inject, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap, catchError, map } from 'rxjs';
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
        catchError(() => {
          // Fallback: si la API no está disponible (producción sin backend),
          // cargar desde los archivos JSON estáticos
          console.warn('API no disponible, cargando proyectos desde JSON estático.');
          return this.http.get<any[]>('/assets/data/projects.json').pipe(
            map(items => items.map(p => ({
              id: p.id ?? 0,
              name: p.name,
              shortDescription: p.shortDescription,
              fullDescription: p.fullDescription,
              role: p.role ?? 'Desarrollador',
              year: p.year ?? 2024,
              status: p.status ?? 'Completed',
              technologies: p.technologies ?? [],
              features: p.features ?? [],
              highlights: p.highlights ?? [],
              githubUrl: p.links?.github ?? p.githubUrl ?? '',
              liveUrl: p.links?.live ?? p.liveUrl ?? null,
              imageUrl: p.image ?? p.imageUrl ?? null,
              displayOrder: p.displayOrder ?? 0
            } as Project)))
          );
        }),
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
