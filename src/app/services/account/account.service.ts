import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import { RegisterAgentPayload, UpdateUserProfilePayload, UserProfileData } from '../../models/account.model';

@Injectable({
  providedIn: 'root',
})
export class AccountService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Account`;

  registerAgent(payload: RegisterAgentPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/register-agent`, payload);
  }

  private getAuthHeaders(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    let headers = new HttpHeaders({
      'Content-Type': 'application/json',
    });
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getUserProfile(userId: string): Observable<ApiResponse<UserProfileData>> {
    return this.http.get<ApiResponse<UserProfileData>>(
      `${this.apiUrl}/user-profile/${userId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  updateUserProfile(
    userId: string,
    payload: UpdateUserProfilePayload
  ): Observable<ApiResponse<UserProfileData>> {
    return this.http.put<ApiResponse<UserProfileData>>(
      `${this.apiUrl}/user-profile/${userId}`,
      payload,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }
}

