import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, NavigationEnd, ActivatedRoute } from '@angular/router';
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
  private routerSub?: Subscription;
  private fragmentSub?: Subscription;

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
    } else if (path === '/about') {
      label = fragment === 'experience' ? 'timeline.json' : 
              fragment === 'stack' ? 'tech-stack.yml' : 'profile.md';
      icon = fragment === 'experience' ? 'pi pi-calendar' : 
             fragment === 'stack' ? 'pi pi-database' : 'pi pi-user';
      iconColor = '#e8a94a';
    } else if (path === '/contact') {
      label = 'links.md';
      icon = 'pi pi-envelope';
      iconColor = '#569cd6';
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
  }

  private syncRouteState(url: string) {
    const [urlWithoutQuery] = url.split('?');
    const [path, fragment] = urlWithoutQuery.split('#');
    
    // Set active menu based on path
    if (path.startsWith('/projects')) this.activeMenu.set('projects');
    else if (path === '/about') this.activeMenu.set('about');
    else if (path === '/contact') this.activeMenu.set('contact');
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
