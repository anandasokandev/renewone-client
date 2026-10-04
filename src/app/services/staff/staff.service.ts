import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import { CreateStaffRequest, StaffFilterParams, StaffPagedResult, StaffResponseData } from '../../models/staff.model';

@Injectable({
  providedIn: 'root',
})
export class StaffService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/User`;

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

  getStaffList(
    accountId: string,
    params: StaffFilterParams = {}
  ): Observable<ApiResponse<StaffResponseData>> {
    let httpParams = new HttpParams();

    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('Search', params.search.trim());
    }

    if (params.status !== undefined && params.status !== null) {
      httpParams = httpParams.set('Status', params.status.toString());
    }

    if (params.pageNumber) {
      httpParams = httpParams.set('PageNumber', params.pageNumber.toString());
    }

    if (params.pageSize) {
      httpParams = httpParams.set('PageSize', params.pageSize.toString());
    }

    return this.http.get<ApiResponse<StaffResponseData>>(
      `${this.apiUrl}/list-all-staffs/${accountId}`,
      {
        headers: this.getAuthHeaders(),
        params: httpParams,
      }
    );
  }

  createStaff(payload: CreateStaffRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.apiUrl}/create-staff`, payload, {
      headers: this.getAuthHeaders(),
    });
  }

  toggleStaffStatus(accountId: string, id: string): Observable<ApiResponse<any>> {
    const url = `${this.apiUrl}/${accountId}/toggle-status/${id}`;
    return this.http.put<ApiResponse<any>>(url, {}, { headers: this.getAuthHeaders() });
  }
}
