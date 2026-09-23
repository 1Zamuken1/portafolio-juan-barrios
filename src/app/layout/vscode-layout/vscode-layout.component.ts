import { Component, inject, OnInit, OnDestroy, signal, computed, effect, ElementRef, ViewChild, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd, ActivatedRoute } from '@angular/router';
import { ThemeService } from '../../core/services/theme.service';
import { DataService } from '../../core/services/data.service';
import { Project } from '../../shared/models/project.model';
import { filter, Subscription } from 'rxjs';
interface EditorTab {
  id: string;
  label: string;
  icon: string;
  iconColor: string;
  route: string;
  fragment?: string;
}

@Component({
  selector: 'app-vscode-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink],
  templateUrl: './vscode-layout.component.html',
  styleUrls: ['./vscode-layout.component.css']
})
export class VscodeLayoutComponent implements OnInit, OnDestroy {
  private dataService = inject(DataService);
  private router = inject(Router);
  private activatedRoute = inject(ActivatedRoute);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  @ViewChild('tiraDePestanas') tiraDePestanas?: ElementRef<HTMLElement>;

  constructor() {
    // La pestana activa siempre visible. Al navegar desde el explorador, la
    // pestana nueva puede quedar fuera del borde derecho y parecer que no
    // paso nada.
    effect(() => {
      const activa = this.activeTabId();
      if (!this.isBrowser || !activa) return;
      queueMicrotask(() => {
        this.tiraDePestanas?.nativeElement
          .querySelector('.tab.active')
          ?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
      });
    });
  }

  /**
   * La rueda del raton desplaza la tira en horizontal, como en VSCode.
   *
   * Un raton normal solo genera deltaY, asi que sobre una tira horizontal no
   * haria nada: habria que arrastrar la barra, que ademas esta oculta. Se
   * convierte el desplazamiento vertical en horizontal y se consume el evento
   * solo si de verdad queda recorrido, para no secuestrar el scroll de la
   * pagina cuando la tira ya esta al final.
   */
  desplazarPestanas(evento: WheelEvent): void {
    const tira = this.tiraDePestanas?.nativeElement;
    if (!tira || tira.scrollWidth <= tira.clientWidth) return;

    const cantidad = Math.abs(evento.deltaY) > Math.abs(evento.deltaX)
      ? evento.deltaY
      : evento.deltaX;
    if (!cantidad) return;

    const antes = tira.scrollLeft;
    tira.scrollLeft += cantidad;
    if (tira.scrollLeft !== antes) evento.preventDefault();
  }

  /**
   * El interruptor de tema vive aqui porque la barra de actividad es lo unico
   * presente en todas las rutas publicas. ThemeService ya existia y ya
   * persistia la eleccion; lo que faltaba era quien lo llamara: toggleTheme()
   * no tenia un solo uso en todo el proyecto desde que se quito el navbar.
   */
  protected tema = inject(ThemeService);
  private routerSub?: Subscription;
  private fragmentSub?: Subscription;

  /** Ancho a partir del cual el explorer deja de ser panel flotante. */
  private static readonly MOBILE_BREAKPOINT = 768;

  isMobile = signal(false);
  isExplorerOpen = signal(true);
  activeMenu = signal('home'); // To keep track of activity bar
  showProfilePanel = signal(false);
  
  openTabs = signal<EditorTab[]>([
    { id: '/', label: 'README.md', icon: 'pi pi-info-circle', iconColor: '#4ec9b0', route: '/' }
  ]);
  activeTabId = signal<string>('/');

  projects = signal<Project[]>([]);
  expandedFolders = signal<Set<string>>(new Set(['projects'])); // Default open 'projects' folder
  private currentPath = signal<{ path: string; fragment: string }>({ path: '/', fragment: '' });

  /** Centraliza el cálculo del folder-key del sidebar para un proyecto. */
  projectFolderKey(project: Project): string {
    return 'project-' + project.id;
  }

  // Helper to determine tab details based on URL
  private getTabDetails(path: string, fragment: string): EditorTab {
    const id = fragment ? `${path}#${fragment}` : path;
    let label = 'README.md';
    let icon = 'pi pi-info-circle';
    let iconColor = '#4ec9b0';
    let route = path;

    if (path === '/') {
      label = 'README.md';
    } else if (path === '/about/trayectoria') {
      // Cada documento del perfil es una ruta propia y no un fragmento del
      // mismo texto, asi que la pestana sale del camino y no del ancla.
      label = 'trayectoria.md';
      icon = 'pi pi-calendar';
      iconColor = '#e8a94a';
    } else if (path === '/about/stack') {
      label = 'stack.md';
      icon = 'pi pi-database';
      iconColor = '#e8a94a';
    } else if (path === '/about') {
      label = 'profile.md';
      icon = 'pi pi-user';
      iconColor = '#e8a94a';
    } else if (path.startsWith('/projects/')) {
      let pIcon = 'pi pi-file';
      let pColor = '#4ec9b0';
      
      if (!fragment || fragment === 'readme') {
        label = 'readme.md';
      } else if (fragment === 'stack') {
        label = 'stack.json';
        pIcon = 'pi pi-code';
        pColor = '#e8a94a';
      } else if (fragment === 'features') {
        label = 'features.ts';
        pColor = '#569cd6';
      } else if (fragment === 'metrics') {
        label = 'metrics.csv';
        pIcon = 'pi pi-table';
        pColor = '#a599e9';
      } else if (fragment === 'architecture') {
        label = 'architecture.drawio';
        pIcon = 'pi pi-sitemap';
        pColor = '#fca311';
      } else if (fragment === 'challenges') {
        label = 'challenges.md';
        pIcon = 'pi pi-exclamation-triangle';
        pColor = '#f72585';
      }

      icon = pIcon;
      iconColor = pColor;
    }

    return { id, label, icon, iconColor, route, fragment };
  }

  ngOnInit() {
    // En movil el explorer es un panel flotante y arranca cerrado, para no
    // comerse el area del editor.
    if (this.isBrowser) {
      this.syncViewport();
      window.addEventListener('resize', this.onResize, { passive: true });
    }

    // Load static projects immediately
    this.dataService.getStaticProjects().subscribe(data => {
      this.projects.set(data.filter(p => p.status !== 'Draft'));
      // Los datos llegaron tarde: re-sincronizo el folder por si la ruta ya
      // apuntaba a un proyecto antes de que `projects` estuviera disponible.
      this.syncExplorerFolders(this.currentPath().path);
    });

    // Sync with router
    this.routerSub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.syncRouteState(e.urlAfterRedirects || e.url);
      });

    // Sync initial route
    this.syncRouteState(this.router.url);
  }

  ngOnDestroy() {
    this.routerSub?.unsubscribe();
    this.fragmentSub?.unsubscribe();
    if (this.isBrowser) window.removeEventListener('resize', this.onResize);
  }

  private onResize = () => this.syncViewport();

  private syncViewport() {
    const mobile = window.innerWidth <= VscodeLayoutComponent.MOBILE_BREAKPOINT;
    const cambio = mobile !== this.isMobile();
    this.isMobile.set(mobile);
    // Solo se fuerza el estado del panel al cruzar el umbral, para no pisar
    // lo que el usuario haya decidido dentro del mismo tamano.
    if (cambio) this.isExplorerOpen.set(!mobile);
  }

  private syncRouteState(url: string) {
    const [urlWithoutQuery] = url.split('?');
    const [path, fragment] = urlWithoutQuery.split('#');
    
    // Set active menu based on path
    if (path.startsWith('/projects')) this.activeMenu.set('projects');
    else if (path.startsWith('/about')) this.activeMenu.set('about');
    else this.activeMenu.set('home');

    // Ignore project internal fragments (like #readme, #stack) from creating new tabs,
    // they should just use the project tab.
    let tabFragment = fragment || '';

    // Keep current path available for later re-sync (e.g. when projects finish loading async)
    this.currentPath.set({ path, fragment: tabFragment });

    const tabDetails = this.getTabDetails(path, tabFragment);

    // Add to open tabs if not exists
    this.openTabs.update(tabs => {
      if (!tabs.find(t => t.id === tabDetails.id)) {
        return [...tabs, tabDetails];
      }
      return tabs;
    });

    this.activeTabId.set(tabDetails.id);

    // En movil el panel tapa el editor: al abrir un archivo se cierra solo.
    if (this.isMobile()) this.isExplorerOpen.set(false);

    // Sync sidebar folder expansion with the navigated route
    this.syncExplorerFolders(path);
  }

  /**
   * Mantiene el explorer sincronizado con la ruta activa.
   * Al navegar a /projects/:id se abre la carpeta del proyecto (y se cierran
   * las hermanas). Se re-ejecuta cuando los proyectos terminan de cargar para
   * cubrir el caso en que la ruta cambió antes de que los datos estuvieran listos.
   */
  private syncExplorerFolders(path: string) {
    const available = this.projects();
    // Aún no cargaron los proyectos: no podemos resolver el folder, se reintentará tras la carga.
    if (path.startsWith('/projects/') && available.length === 0) return;

    this.expandedFolders.update(set => {
      const next = new Set(set);

      // Ruta de la lista de proyectos (sin id): abre solo el folder padre.
      if (path === '/projects' || path === '/projects/') {
        next.add('projects');
        available.forEach(p => next.delete(this.projectFolderKey(p)));
        return next;
      }

      if (path.startsWith('/projects/')) {
        const id = path.split('/')[2];
        const project = available.find(p => p.id === Number(id)) ||
          available.find(p => p.slug === id);

        if (project) {
          const key = this.projectFolderKey(project);
          next.add('projects');   // asegura el folder padre abierto
          next.add(key);          // abre la carpeta del proyecto navegado
          // Colapso hermanos (enfoque estilo VSCode: un proyecto a la vez)
          available.forEach(p => {
            const other = this.projectFolderKey(p);
            if (other !== key) next.delete(other);
          });
        }
        return next;
      }

      // Otras rutas: si no son de proyectos, cierra los folders de proyectos.
      if (!path.startsWith('/projects')) {
        next.add('projects');
        available.forEach(p => next.delete(this.projectFolderKey(p)));
      }

      return next;
    });
  }

  closeTab(tabId: string, event: Event) {
    event.stopPropagation();
    
    this.openTabs.update(tabs => {
      const newTabs = tabs.filter(t => t.id !== tabId);
      
      // If we closed the active tab, navigate to the last one available
      if (this.activeTabId() === tabId) {
        if (newTabs.length > 0) {
          const nextTab = newTabs[newTabs.length - 1];
          this.router.navigate([nextTab.route], { fragment: nextTab.fragment });
        } else {
          // If no tabs left, go to home
          this.router.navigate(['/']);
        }
      }
      
      return newTabs;
    });
  }

  toggleExplorer() {
    this.isExplorerOpen.update(v => !v);
  }

  toggleFolder(projectId: string) {
    this.expandedFolders.update(set => {
      const newSet = new Set(set);
      if (newSet.has(projectId)) {
        newSet.delete(projectId);
      } else {
        newSet.add(projectId);
      }
      return newSet;
    });
  }

  setActiveMenu(menu: string) {
    this.activeMenu.set(menu);
    if (!this.isExplorerOpen()) {
      this.isExplorerOpen.set(true);
    }
  }

  toggleProfilePanel() {
    this.showProfilePanel.update(v => !v);
  }

  closeProfilePanel() {
    this.showProfilePanel.set(false);
  }
}
