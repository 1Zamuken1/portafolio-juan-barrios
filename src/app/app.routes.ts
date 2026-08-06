import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/vscode-layout/vscode-layout.component').then(m => m.VscodeLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/welcome/welcome.component').then(m => m.WelcomeComponent) },
      { path: 'projects', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'projects/:id', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'about', loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent) },
      { path: 'contact', loadComponent: () => import('./features/contact/contact.component').then(m => m.ContactComponent) }
    ]
  },
  { path: 'admin/login', loadComponent: () => import('./features/admin/login/login.component').then(m => m.LoginComponent) },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./features/admin/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      { path: 'projects', loadComponent: () => import('./features/admin/projects/admin-projects/admin-projects.component').then(m => m.AdminProjectsComponent) },
      { path: 'projects/new', loadComponent: () => import('./features/admin/projects/admin-project-form/admin-project-form.component').then(m => m.AdminProjectFormComponent) },
      { path: 'projects/edit/:id', loadComponent: () => import('./features/admin/projects/admin-project-form/admin-project-form.component').then(m => m.AdminProjectFormComponent) },
      
      { path: 'experience', loadComponent: () => import('./features/admin/experience/admin-experiences/admin-experiences.component').then(m => m.AdminExperiencesComponent) },
      { path: 'experience/new', loadComponent: () => import('./features/admin/experience/admin-experience-form/admin-experience-form.component').then(m => m.AdminExperienceFormComponent) },
      { path: 'experience/edit/:id', loadComponent: () => import('./features/admin/experience/admin-experience-form/admin-experience-form.component').then(m => m.AdminExperienceFormComponent) },
      
      { path: 'skills', loadComponent: () => import('./features/admin/skills/admin-skills/admin-skills.component').then(m => m.AdminSkillsComponent) },
      { path: 'skills/new', loadComponent: () => import('./features/admin/skills/admin-skill-form/admin-skill-form.component').then(m => m.AdminSkillFormComponent) },
      { path: 'skills/edit/:id', loadComponent: () => import('./features/admin/skills/admin-skill-form/admin-skill-form.component').then(m => m.AdminSkillFormComponent) }
    ]
  },
  { path: '**', redirectTo: '' }
];
