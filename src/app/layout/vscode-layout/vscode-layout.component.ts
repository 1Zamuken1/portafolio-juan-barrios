import { Component, inject, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, RouterLink, RouterLinkActive, NavigationEnd, ActivatedRoute } from '@angular/router';
import { DataService } from '../../core/services/data.service';
import { Project } from '../../shared/models/project.model';
import { filter, Subscription } from 'rxjs';
interface EditorTab {
  label: string;
  icon: string;
  iconColor: string;
  route: string;
}

@Component({
  selector: 'app-vscode-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
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
  activeMenu = signal('home');
  showProfilePanel = signal(false);
  currentTab = signal<EditorTab>({ label: 'README.md', icon: 'pi pi-file', iconColor: '#4ec9b0', route: '/' });

  projects = signal<Project[]>([]);
  expandedFolders = signal<Set<string>>(new Set());
  activeFragment = signal<string>('readme');
  activeProjectId = signal<string>('');

  // Map from route pattern → tab definition
  private readonly routeTabMap: { pattern: RegExp; tab: EditorTab; menu: string }[] = [
    {
      pattern: /^\/$/,
      menu: 'home',
      tab: { label: 'README.md', icon: 'pi pi-file', iconColor: '#4ec9b0', route: '/' }
    },
    {
      pattern: /^\/projects\/(.+)$/,
      menu: 'projects',
      tab: { label: 'project.md', icon: 'pi pi-file', iconColor: '#4ec9b0', route: '/projects' }
    },
    {
      pattern: /^\/projects$/,
      menu: 'projects',
      tab: { label: 'explorer.md', icon: 'pi pi-folder', iconColor: '#e8b74a', route: '/projects' }
    },
    {
      pattern: /^\/about$/,
      menu: 'about',
      tab: { label: 'profile.json', icon: 'pi pi-code', iconColor: '#e8a94a', route: '/about' }
    },
    {
      pattern: /^\/contact$/,
      menu: 'contact',
      tab: { label: 'send-message.ts', icon: 'pi pi-file', iconColor: '#569cd6', route: '/contact' }
    }
  ];

  ngOnInit() {
    // Load static projects immediately
    this.dataService.getStaticProjects().subscribe(data =>
      this.projects.set(data.filter(p => p.status !== 'Draft'))
    );

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
    // Strip query params and extract fragment
    const [urlWithoutQuery] = url.split('?');
    const [path, fragment] = urlWithoutQuery.split('#');

    // Update active fragment
    if (fragment) {
      this.activeFragment.set(fragment);
    }

    for (const entry of this.routeTabMap) {
      const match = path.match(entry.pattern);
      if (match) {
        // For project detail, update label and icon based on fragment
        if (entry.menu === 'projects' && match[1]) {
          let fileName = 'readme.md';
          let fileIcon = 'pi pi-file';
          let fileColor = '#4ec9b0';
          
          if (fragment === 'stack') {
            fileName = 'stack.json';
            fileIcon = 'pi pi-code';
            fileColor = '#e8a94a';
          } else if (fragment === 'features') {
            fileName = 'features.ts';
            fileIcon = 'pi pi-file';
            fileColor = '#569cd6';
          } else if (fragment === 'metrics') {
            fileName = 'metrics.csv';
            fileIcon = 'pi pi-table';
            fileColor = '#a599e9';
          }

          this.currentTab.set({
            ...entry.tab,
            label: fileName,
            icon: fileIcon,
            iconColor: fileColor
          });
          this.activeProjectId.set(match[1]);
        } else {
          this.currentTab.set({ ...entry.tab });
          if (entry.menu !== 'projects') {
            this.activeProjectId.set('');
          }
        }
        this.activeMenu.set(entry.menu);
        return;
      }
    }
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
