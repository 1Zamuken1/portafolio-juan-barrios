import { Injectable, inject, signal, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  
  // Using signals for state management (modern Angular)
  isAuthenticated = signal<boolean>(this.hasToken());

  login(credentials: any) {
    const apiUrl = environment.apiUrl;
    return this.http.post<{token: string}>(`${apiUrl}/auth/login`, credentials).pipe(
      tap(res => {
        if (res && res.token) {
          if (this.isBrowser) localStorage.setItem('jwt_token', res.token);
          this.isAuthenticated.set(true);
        }
      }),
      catchError(err => {
        return throwError(() => new Error('Login failed'));
      })
    );
  }

  logout() {
    if (this.isBrowser) localStorage.removeItem('jwt_token');
    this.isAuthenticated.set(false);
    this.router.navigate(['/admin/login']);
  }

  /** En el servidor no hay sesion: el prerender nunca esta autenticado. */
  getToken(): string | null {
    return this.isBrowser ? localStorage.getItem('jwt_token') : null;
  }

  private hasToken(): boolean {
    return !!this.getToken();
  }
}
