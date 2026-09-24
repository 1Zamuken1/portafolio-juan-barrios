import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./layout/vscode-layout/vscode-layout.component').then(m => m.VscodeLayoutComponent),
    children: [
      { path: '', loadComponent: () => import('./features/welcome/welcome.component').then(m => m.WelcomeComponent) },
      { path: 'projects', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'projects/:id', loadComponent: () => import('./features/projects/projects.component').then(m => m.ProjectsComponent) },
      { path: 'about', loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent) },
      { path: 'about/trayectoria', loadComponent: () => import('./features/about/trayectoria/trayectoria.component').then(m => m.TrayectoriaComponent) },
      { path: 'about/stack', loadComponent: () => import('./features/about/stack/stack.component').then(m => m.StackComponent) }
    ]
  },
  // El panel, con sus rutas y su PrimeNG, se carga solo al entrar en /admin.
  { path: 'admin', loadChildren: () => import('./features/admin/admin.routes').then(m => m.ADMIN_ROUTES) },
  { path: '**', redirectTo: '' }
];
