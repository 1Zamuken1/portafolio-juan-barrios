import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay, tap } from 'rxjs';
import { Project } from '../../shared/models/project.model';
import { SkillsData } from '../../shared/models/skill.model';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);

  /** Cached observables — only one HTTP request per resource */
  private projects$: Observable<Project[]> | null = null;
  private skills$: Observable<SkillsData> | null = null;

  getProjects(): Observable<Project[]> {
    if (!this.projects$) {
      this.projects$ = this.http.get<Project[]>('/assets/data/projects.json').pipe(
        shareReplay(1)
      );
    }
    return this.projects$;
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
