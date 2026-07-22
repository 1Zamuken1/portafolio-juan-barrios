import { Routes } from '@angular/router';
import { LoginComponent } from './features/admin/login/login.component';
import { DashboardComponent } from './features/admin/dashboard/dashboard.component';
import { AdminProjectsComponent } from './features/admin/projects/admin-projects/admin-projects.component';
import { AdminProjectFormComponent } from './features/admin/projects/admin-project-form/admin-project-form.component';
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
      { path: 'projects/edit/:id', component: AdminProjectFormComponent }
    ]
  },
  { path: '**', redirectTo: '' }
];
