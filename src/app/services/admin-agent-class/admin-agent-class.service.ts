import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import { AdminAgentClass, AgentClassRequest } from '../../models/admin-agent-class.model';

@Injectable({ providedIn: 'root' })
export class AdminAgentClassService {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.apiUrl}/Admin`;

  getAll(): Observable<ApiResponse<AdminAgentClass[]>> {
    return this.http.get<ApiResponse<AdminAgentClass[]>>(`${this.url}/view-agentclass`);
  }

  getById(id: string): Observable<ApiResponse<AdminAgentClass>> {
    return this.http.get<ApiResponse<AdminAgentClass>>(`${this.url}/view-agentclass/${encodeURIComponent(id)}`);
  }

  create(request: AgentClassRequest): Observable<ApiResponse<AdminAgentClass>> {
    return this.http.post<ApiResponse<AdminAgentClass>>(`${this.url}/agentclass`, request);
  }

  update(id: string, request: AgentClassRequest): Observable<ApiResponse<AdminAgentClass>> {
    return this.http.put<ApiResponse<AdminAgentClass>>(`${this.url}/agentclass/${encodeURIComponent(id)}`, request);
  }

  toggleStatus(id: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.url}/agentclass/${encodeURIComponent(id)}/toggle-status`, {});
  }
}
