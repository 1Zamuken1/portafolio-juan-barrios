import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './core/services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'Portafolio Juan Barrios';

  // ThemeService es la unica fuente de verdad del tema: su constructor aplica
  // el atributo data-theme y lo persiste. Se inyecta aqui para instanciarlo
  // al arrancar la aplicacion.
  private readonly themeService = inject(ThemeService);
}
