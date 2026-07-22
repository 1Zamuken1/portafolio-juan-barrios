import { Injectable, inject, signal, isDevMode } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  
  // Using signals for state management (modern Angular)
  isAuthenticated = signal<boolean>(this.hasToken());

  login(credentials: any) {
    // Assuming backend is running on 8080 during dev.
    const apiUrl = isDevMode() ? 'http://localhost:8080/api' : '/api';
    return this.http.post<{token: string}>(`${apiUrl}/auth/login`, credentials).pipe(
      tap(res => {
        if (res && res.token) {
          localStorage.setItem('jwt_token', res.token);
          this.isAuthenticated.set(true);
        }
      }),
      catchError(err => {
        return throwError(() => new Error('Login failed'));
      })
    );
  }

  logout() {
    localStorage.removeItem('jwt_token');
    this.isAuthenticated.set(false);
    this.router.navigate(['/admin/login']);
  }

  getToken(): string | null {
    return localStorage.getItem('jwt_token');
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('jwt_token');
  }
}
