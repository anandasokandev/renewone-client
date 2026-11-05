import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import { AdminEmployeePagedData, GetAllEmployeesPayload } from '../../models/employee.model';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/User/admin`;

  getAllEmployees(payload: GetAllEmployeesPayload): Observable<ApiResponse<AdminEmployeePagedData>> {
    return this.http.post<ApiResponse<AdminEmployeePagedData>>(
      `${this.apiUrl}/get-all-employees`,
      payload
    );
  }

  toggleEmployeeStatus(id: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.apiUrl}/toggle-status/${id}`, {});
  }
}

