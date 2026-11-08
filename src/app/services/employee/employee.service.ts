import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import {
  AdminEmployeePagedData,
  CreateInternalUserPayload,
  EmployeeRights,
  GetAllEmployeesPayload,
  UpdateEmployeePayload,
  UpdateEmployeeRightsPayload,
} from '../../models/employee.model';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/User/admin`;

  getAllEmployees(payload: GetAllEmployeesPayload): Observable<ApiResponse<AdminEmployeePagedData>> {
    const params = new HttpParams()
      .set('Search', payload.Search)
      .set('PageNumber', payload.PageNumber)
      .set('PageSize', payload.PageSize);
    return this.http.post<ApiResponse<AdminEmployeePagedData>>(
      `${this.apiUrl}/get-all-employees`,
      null,
      { params }
    );
  }

  createInternalUser(payload: CreateInternalUserPayload): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/create-internal-user`, payload);
  }

  toggleEmployeeStatus(id: string): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/toggle-employee-status/${id}`, {});
  }

  getEmployeeRights(id: string): Observable<ApiResponse<EmployeeRights>> {
    return this.http.get<ApiResponse<EmployeeRights>>(`${this.apiUrl}/employee-rights/${id}`);
  }

  updateEmployeeRights(payload: UpdateEmployeeRightsPayload): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/update-employee-rights`, payload);
  }

  updateEmployee(payload: UpdateEmployeePayload): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(`${this.apiUrl}/update-employee`, payload);
  }
}

