import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import { DashboardProduct } from '../../models/dashboard.model';

@Injectable({
  providedIn: 'root',
})
export class DashboardService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/Dashboard`;

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

  getDashboardProducts(): Observable<ApiResponse<DashboardProduct[]>> {
    return this.http.get<ApiResponse<DashboardProduct[]>>(`${this.apiUrl}/products`, {
      headers: this.getAuthHeaders(),
    });
  }
}
