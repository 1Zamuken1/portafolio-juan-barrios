import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export interface EmailJsConfig {
  publicKey: string;
  serviceId: string;
  templateId: string;
}

export interface AppConfig {
  emailjs: EmailJsConfig;
}

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private http = inject(HttpClient);
  private config = signal<AppConfig | null>(null);
  private loaded = signal(false);

  getConfig(): AppConfig | null {
    return this.config();
  }

  isLoaded(): boolean {
    return this.loaded();
  }

  loadConfig(): void {
    if (this.loaded()) return;

    this.http.get<AppConfig>('/config.json')
      .pipe(
        tap(cfg => {
          this.config.set(cfg);
          this.loaded.set(true);
        }),
        catchError(err => {
          console.error('Failed to load config.json', err);
          this.loaded.set(true);
          return throwError(() => err);
        })
      )
      .subscribe();
  }
}