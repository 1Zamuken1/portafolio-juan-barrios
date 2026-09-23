import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, map } from 'rxjs';
import { Project } from '../../shared/models/project.model';
import { Perfil } from '../../shared/models/perfil.model';
import { Experience } from '../../shared/models/experience.model';
import { AdminSkill, SkillCategory, Skill } from '../../shared/models/skill.model';
import { environment } from '../../../environments/environment';

// Los datos publicos son un activo de compilacion, no un recurso remoto:
// asi el prerender puede resolverlos sin servidor y el navegador se ahorra
// tres peticiones.
import projectsData from '../../../assets/data/projects.json';
import experiencesData from '../../../assets/data/experiences.json';
import skillsData from '../../../assets/data/skills.json';
import perfilData from '../../../assets/data/perfil.json';

@Injectable({ providedIn: 'root' })
export class DataService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // ═══════════════════════════════════════════
  //  STATIC DATA (JSON from assets — for production mirror)
  // ═══════════════════════════════════════════

  /**
   * Los datos de cabecera del perfil: titulo, ubicacion y estado laboral.
   *
   * No pasan por el backend como el resto. Son cinco cadenas que cambian una
   * vez al ano; montarles un modelo, una tabla y un formulario costaria mas
   * que editarlas aqui, y el sitio publico las leeria igual desde este fichero.
   */
  getStaticPerfil(): Observable<Perfil> {
    return of(perfilData as Perfil);
  }

  getStaticProjects(): Observable<Project[]> {
    return of(projectsData as unknown as Project[]);
  }

  getStaticExperiences(): Observable<Experience[]> {
    return of(experiencesData as unknown as Experience[]);
  }

  getStaticSkills(): Observable<SkillCategory[]> {
    return of(skillsData as unknown as SkillCategory[]);
  }

  getStaticSkillsFlat(): Observable<AdminSkill[]> {
    return this.getStaticSkills().pipe(
      map((categories) => {
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

  // El borrador ya no se pide desde aqui: BorradorStreamService va contra
  // /projects/draft/stream, que cuenta por donde va mientras redacta. El
  // endpoint de una sola respuesta sigue en el backend, con sus pruebas, porque
  // es el contrato simple y no depende de que el navegador sepa leer un cuerpo
  // a trozos.

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
