import { Injectable, signal, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { DOCUMENT } from '@angular/common';

export type Theme = 'light' | 'dark';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private document = inject(DOCUMENT);
  private platformId = inject(PLATFORM_ID);

  /** Current theme as a signal — reactive everywhere */
  readonly theme = signal<Theme>('dark');

  constructor() {
    if (isPlatformBrowser(this.platformId)) {
      this.initTheme();
    }

    // Reactively apply data-theme attribute whenever theme changes
    effect(() => {
      const current = this.theme();
      this.document.documentElement.setAttribute('data-theme', current);
      if (isPlatformBrowser(this.platformId)) {
        localStorage.setItem('jeb-theme', current);
      }
    });
  }

  private initTheme(): void {
    const saved = localStorage.getItem('jeb-theme') as Theme | null;
    if (saved) {
      this.theme.set(saved);
      return;
    }
    // Default to dark mode as specified
    this.theme.set('dark');
  }

  toggleTheme(): void {
    this.theme.update(current => current === 'light' ? 'dark' : 'light');
  }

  isDark(): boolean {
    return this.theme() === 'dark';
  }
}
