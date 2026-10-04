import { computed, inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { HttpClient } from '@angular/common/http';
import { LoginRequest, UserData } from '../../models/auth.model';
import { Observable, tap } from 'rxjs';
import { ApiResponse } from '../../models/response.model';

@Injectable({
  providedIn: 'root',
})
export class Auth {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Auth`;

  currentUser = signal<UserData | null>(this.getStoredUser());
  isAuthenticated = computed(() => !!this.currentUser() && !!this.getToken());
  isAgent = computed(() => this.currentUser()?.userType?.trim().toLowerCase() === 'agent');


  login(payload: LoginRequest): Observable<ApiResponse<UserData>> {
    return this.http.post<ApiResponse<UserData>>(`${this.apiUrl}/login`, payload).pipe(
      tap(res => {
        if (res.isSuccess && res.data) {
          sessionStorage.setItem('token', res.data.token);
          sessionStorage.setItem('user', JSON.stringify(res.data));
          sessionStorage.setItem('accountId', JSON.stringify(res.data.accountId));
          this.currentUser.set(res.data);
        }
      })
    );
  }

  logout(): void {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('accountId');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('accountId');
    this.currentUser.set(null);
  }

  getToken(): string | null {
    return sessionStorage.getItem('token') || localStorage.getItem('token');
  }

  private getStoredUser(): UserData | null {
    const data = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (!data) return null;
    try {
      const user = JSON.parse(data);
      const token = localStorage.getItem('token');
      if (token && !sessionStorage.getItem('token')) {
        sessionStorage.setItem('token', token);
      }
      if (!sessionStorage.getItem('user')) {
        sessionStorage.setItem('user', data);
      }
      // const accountId = localStorage.getItem('accountId');
      // if (accountId && !sessionStorage.getItem('accountId')) {
      //   sessionStorage.setItem('accountId', accountId);
      // }
      return user;
    } catch {
      return null;
    }
  }
}

