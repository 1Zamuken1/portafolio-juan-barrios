import { BootstrapContext, bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { config } from './app/app.config.server';

/**
 * Angular 22 exige recibir el BootstrapContext en el arranque del servidor:
 * sin el, la extraccion de rutas falla con NG0401 (Missing Platform).
 */
const bootstrap = (context: BootstrapContext) =>
  bootstrapApplication(AppComponent, config, context);

export default bootstrap;
