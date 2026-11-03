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

  getAgentLookup(search = '', pageNumber = 1, pageSize = 20): Observable<ApiResponse<AgentLookupResponse>> {
    let params = new HttpParams().set('PageNumber', pageNumber).set('PageSize', pageSize);
    if (search.trim()) params = params.set('Search', search.trim());
    return this.http.get<ApiResponse<AgentLookupResponse>>(`${this.apiUrl}/agent-lookup`, { params });
  }

  toggleAgentStatus(accountId: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/${accountId}/toggle-status`, {});
  }

  approveAgent(accountId: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/approve-agent/${accountId}`, {});
  }
}

export interface AgentLookupItem {
  accountId: string;
  agentId?: string;
  agentCode?: string;
  agentName: string;
  agencyName?: string;
  phoneNumber?: string;
  mobileNumber?: string;
  agentClass?: string;
  commissionPercentage?: number;
  walletBalance?: number;
  status?: string;
  isActive?: boolean;
}

export interface AgentLookupResponse {
  items: AgentLookupItem[];
  pageNumber?: number;
  pageSize?: number;
  totalRecords?: number;
  totalPages?: number;
  hasNextPage?: boolean;
}

