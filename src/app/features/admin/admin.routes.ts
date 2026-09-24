import { inject, provideEnvironmentInitializer } from '@angular/core';
import { Routes } from '@angular/router';
import { PRIME_NG_CONFIG, PrimeNG, PrimeNGConfigType } from 'primeng/config';
import { authGuard } from '../../core/guards/auth.guard';
import { PresetPanel } from '../../core/tema/preset-panel';

/**
 * La configuracion de PrimeNG del panel.
 *
 * No se usa providePrimeNG() porque registra la configuracion con
 * provideAppInitializer, y los inicializadores de aplicacion no se ejecutan
 * en el inyector de una ruta: el tema no llegaba a cargarse, sin ningun error.
 * Un inicializador de entorno si corre al crearse ese inyector, y PrimeNG es
 * un servicio de la raiz, asi que la configuracion vale para todo el panel.
 */
const CONFIG_PRIMENG: PrimeNGConfigType = {
  // Las listas y los menus se montan en <body>, no junto a su campo. Cada
  // seccion del panel es vidrio (backdrop-filter), y eso le da su propio
  // contexto de apilamiento: una lista abierta dentro de ella quedaba por
  // debajo de la seccion siguiente, por alto que fuera su z-index.
  overlayAppendTo: 'body',
  theme: {
    preset: PresetPanel,
    options: {
      darkModeSelector: '[data-theme="dark"]',
      cssLayer: false
    }
  },
  ripple: true
};

/**
 * Las rutas del panel, con PrimeNG como proveedor suyo y no de toda la app.
 *
 * La configuracion de PrimeNG estaba en app.config, y eso metia el tema (el preset de Aura,
 * 104 kB) y la base de PrimeNG en el main.js del portafolio publico, que no
 * usa ni un componente de PrimeNG: solo sus iconos, que son CSS. Aqui se carga
 * con el primer /admin y nunca en la portada.
 */
export const ADMIN_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: PRIME_NG_CONFIG, useValue: CONFIG_PRIMENG },
      provideEnvironmentInitializer(() => inject(PrimeNG).setConfig(CONFIG_PRIMENG))
    ],
    children: [
      { path: 'login', loadComponent: () => import('./login/login.component').then(m => m.LoginComponent) },
      {
        path: 'dashboard',
        loadComponent: () => import('./dashboard/dashboard.component').then(m => m.DashboardComponent),
        canActivate: [authGuard],
        children: [
          { path: '', redirectTo: 'projects', pathMatch: 'full' },
          { path: 'projects', loadComponent: () => import('./projects/admin-projects/admin-projects.component').then(m => m.AdminProjectsComponent) },
          { path: 'projects/new', loadComponent: () => import('./projects/admin-project-form/admin-project-form.component').then(m => m.AdminProjectFormComponent) },
          { path: 'projects/edit/:id', loadComponent: () => import('./projects/admin-project-form/admin-project-form.component').then(m => m.AdminProjectFormComponent) },

          { path: 'experience', loadComponent: () => import('./experience/admin-experiences/admin-experiences.component').then(m => m.AdminExperiencesComponent) },
          { path: 'experience/new', loadComponent: () => import('./experience/admin-experience-form/admin-experience-form.component').then(m => m.AdminExperienceFormComponent) },
          { path: 'experience/edit/:id', loadComponent: () => import('./experience/admin-experience-form/admin-experience-form.component').then(m => m.AdminExperienceFormComponent) },

          { path: 'skills', loadComponent: () => import('./skills/admin-skills/admin-skills.component').then(m => m.AdminSkillsComponent) },
          { path: 'skills/new', loadComponent: () => import('./skills/admin-skill-form/admin-skill-form.component').then(m => m.AdminSkillFormComponent) },
          { path: 'skills/edit/:id', loadComponent: () => import('./skills/admin-skill-form/admin-skill-form.component').then(m => m.AdminSkillFormComponent) }
        ]
      },
      // /admin a secas, o una ruta del panel que no existe: al login, que ya
      // manda al panel si hay sesion.
      { path: '**', redirectTo: 'login' }
    ]
  }
];
