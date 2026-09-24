import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { providePrimeNG } from 'primeng/config';
import { PresetPanel } from './core/tema/preset-panel';
import { routes } from './app.routes';
import { jwtInterceptor } from './core/interceptors/jwt.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' })),
    provideHttpClient(withFetch(), withInterceptors([jwtInterceptor])),
    // El HTML prerenderizado se reaprovecha en vez de volver a pintarse.
    provideClientHydration(withEventReplay()),
    provideAnimationsAsync(),
    providePrimeNG({
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
    })
  ]
};
