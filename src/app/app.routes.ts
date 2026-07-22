import { Routes } from '@angular/router';
import { LoginComponent } from './features/admin/login/login.component';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';
import { AdminProjectsComponent } from './features/admin/projects/admin-projects/admin-projects.component';
import { AdminProjectFormComponent } from './features/admin/projects/admin-project-form/admin-project-form.component';
import { AdminExperiencesComponent } from './features/admin/experience/admin-experiences/admin-experiences.component';
import { AdminExperienceFormComponent } from './features/admin/experience/admin-experience-form/admin-experience-form.component';
import { AdminSkillsComponent } from './features/admin/skills/admin-skills/admin-skills.component';
import { AdminSkillFormComponent } from './features/admin/skills/admin-skill-form/admin-skill-form.component';
import { authGuard } from './core/guards/auth.guard';
import { HomeComponent } from './features/home/home.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'admin/login', component: LoginComponent },
  {
    path: 'admin/dashboard',
    component: DashboardComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'projects', pathMatch: 'full' },
      { path: 'projects', component: AdminProjectsComponent },
      { path: 'projects/new', component: AdminProjectFormComponent },
      { path: 'projects/edit/:id', component: AdminProjectFormComponent },
      
      { path: 'experience', component: AdminExperiencesComponent },
      { path: 'experience/new', component: AdminExperienceFormComponent },
      { path: 'experience/edit/:id', component: AdminExperienceFormComponent },
      
      { path: 'skills', component: AdminSkillsComponent },
      { path: 'skills/new', component: AdminSkillFormComponent },
      { path: 'skills/edit/:id', component: AdminSkillFormComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
