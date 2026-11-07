import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import { CreateVendorRequest, UpdateVendorRequest, Vendor } from '../../models/vendor.model';

@Injectable({ providedIn: 'root' })
export class VendorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/Vendor`;

  getVendors(): Observable<ApiResponse<Vendor[]>> {
    return this.http.get<ApiResponse<Vendor[]>>(this.baseUrl);
  }

  getVendor(id: string): Observable<ApiResponse<Vendor>> {
    return this.http.get<ApiResponse<Vendor>>(`${this.baseUrl}/${id}`);
  }

  createVendor(request: CreateVendorRequest): Observable<ApiResponse<Vendor>> {
    return this.http.post<ApiResponse<Vendor>>(this.baseUrl, request);
  }

  updateVendor(id: string, request: UpdateVendorRequest): Observable<ApiResponse<Vendor>> {
    return this.http.put<ApiResponse<Vendor>>(`${this.baseUrl}/${id}`, request);
  }

  toggleVendorStatus(id: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/toggle/${id}`, null);
  }
}
