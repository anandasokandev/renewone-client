import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import {
  CreateInsuranceTypeRequest,
  CreateVehicleTypeRequest,
  InsuranceTypeItem,
  UpdateInsuranceTypeRequest,
  UpdateVehicleTypeRequest,
  VehicleTypeItem,
} from '../../models/insurance-management.model';

@Injectable({ providedIn: 'root' })
export class InsuranceManagementService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  // Insurance Types
  getInsuranceTypes(): Observable<ApiResponse<InsuranceTypeItem[]>> {
    return this.http.get<ApiResponse<InsuranceTypeItem[]>>(`${this.baseUrl}/insurance-types`);
  }

  createInsuranceType(payload: CreateInsuranceTypeRequest): Observable<ApiResponse<InsuranceTypeItem>> {
    return this.http.post<ApiResponse<InsuranceTypeItem>>(`${this.baseUrl}/insurance-types`, payload);
  }

  updateInsuranceType(id: string, payload: UpdateInsuranceTypeRequest): Observable<ApiResponse<InsuranceTypeItem>> {
    return this.http.put<ApiResponse<InsuranceTypeItem>>(`${this.baseUrl}/insurance-types/${encodeURIComponent(id)}`, payload);
  }

  toggleInsuranceTypeStatus(id: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/insurance-types/${encodeURIComponent(id)}/status`, {});
  }

  deleteInsuranceType(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/insurance-types/${encodeURIComponent(id)}`);
  }

  // Vehicle Types
  getVehicleTypes(): Observable<ApiResponse<VehicleTypeItem[]>> {
    return this.http.get<ApiResponse<VehicleTypeItem[]>>(`${this.baseUrl}/vehicle-types`);
  }

  createVehicleType(payload: CreateVehicleTypeRequest): Observable<ApiResponse<VehicleTypeItem>> {
    return this.http.post<ApiResponse<VehicleTypeItem>>(`${this.baseUrl}/vehicle-types`, payload);
  }

  updateVehicleType(id: string, payload: UpdateVehicleTypeRequest): Observable<ApiResponse<VehicleTypeItem>> {
    return this.http.put<ApiResponse<VehicleTypeItem>>(`${this.baseUrl}/vehicle-types/${encodeURIComponent(id)}`, payload);
  }

  toggleVehicleTypeStatus(id: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/vehicle-types/${encodeURIComponent(id)}/status`, {});
  }

  deleteVehicleType(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.baseUrl}/vehicle-types/${encodeURIComponent(id)}`);
  }
}

