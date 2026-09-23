import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ThemeService } from '../../../core/services/theme.service';
import { FormsModule } from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SelectButtonModule } from 'primeng/selectbutton';
import { ToastModule } from 'primeng/toast';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive, FormsModule,
    ButtonModule, ConfirmDialogModule, SelectButtonModule, ToastModule
  ],
  // Un solo servicio de avisos y uno de confirmacion para todo el panel, con
  // su <p-toast> y su <p-confirmdialog> aqui en el armazon. Antes cada vista
  // montaba los suyos, y un aviso lanzado justo antes de navegar --"proyecto
  // creado"-- desaparecia con la vista que lo lanzo. Las vistas los heredan
  // porque se crean dentro del router-outlet de este componente.
  providers: [MessageService, ConfirmationService],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent {
  private authService = inject(AuthService);
  protected tema = inject(ThemeService);

  protected readonly temas = [
    { label: 'Oscuro', value: 'dark', icono: 'pi pi-moon' },
    { label: 'Claro', value: 'light', icono: 'pi pi-sun' }
  ];

  logout() {
    this.authService.logout();
  }
}
