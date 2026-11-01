import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import {
  AgentFilterParams,
  AgentsResponseData,
  RegisterAgentPayload,
  UpdateUserProfilePayload,
  UserProfileData,
} from '../../models/account.model';

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

  getAgents(params: AgentFilterParams = {}): Observable<ApiResponse<AgentsResponseData>> {
    let httpParams = new HttpParams();
    httpParams = httpParams.set('SortBy', params.sortBy || 'Name');
    httpParams = httpParams.set('SortOrder', params.sortOrder || 'Asc');
    httpParams = httpParams.set('PageNumber', (params.pageNumber || 1).toString());
    httpParams = httpParams.set('PageSize', (params.pageSize || 5).toString());
    httpParams = httpParams.set('UserType', params.userType || 'Agent');

    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('Search', params.search.trim());
    }
    if (params.status && params.status !== 'All') {
      httpParams = httpParams.set('Status', params.status);
    }

    return this.http.get<ApiResponse<AgentsResponseData>>(`${this.apiUrl}/agents`, {
      params: httpParams,
    });
  }

  toggleAgentStatus(accountId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${accountId}/toggle-status`, {});
  }

  approveAgent(accountId: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/approve-agent/${accountId}`, {});
  }
}

