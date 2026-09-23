/**
 * Lo que importa de PrimeNG una vista del panel con formulario, en un solo
 * sitio para que todas usen las mismas piezas.
 */
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { CrecerConTextoDirective } from './crecer-con-texto.directive';

export const PRIMENG_FORMULARIO = [
  ButtonModule,
  FloatLabelModule,
  InputNumberModule,
  InputTextModule,
  SelectModule,
  TextareaModule,
  CrecerConTextoDirective
] as const;
