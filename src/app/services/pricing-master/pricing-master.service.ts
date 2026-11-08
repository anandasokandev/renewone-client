import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import {
  PricingAgentClassOption,
  PricingCompanyOption,
  PricingMasterFilters,
  PricingMasterItem,
  PricingMasterPage,
  PricingMasterRequest,
  PricingVehicleTypeOption,
} from '../../models/pricing-master.model';

@Injectable({ providedIn: 'root' })
export class PricingMasterService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/PricingMaster`;

  getPricing(filters: PricingMasterFilters): Observable<ApiResponse<PricingMasterPage>> {
    let params = new HttpParams()
      .set('pageNumber', filters.pageNumber)
      .set('pageSize', filters.pageSize);
    if (filters.search) params = params.set('search', filters.search);
    if (filters.insuranceCompanyId) params = params.set('insuranceCompanyId', filters.insuranceCompanyId);
    if (filters.agentClassId) params = params.set('agentClassId', filters.agentClassId);
    if (filters.vehicleTypeId) params = params.set('vehicleTypeId', filters.vehicleTypeId);
    if (filters.fuelType) params = params.set('fuelType', filters.fuelType);
    if (filters.isActive !== undefined) params = params.set('isActive', filters.isActive);
    return this.http.get<ApiResponse<PricingMasterPage>>(this.baseUrl, { params });
  }

  getPricingById(id: string): Observable<ApiResponse<PricingMasterItem>> {
    return this.http.get<ApiResponse<PricingMasterItem>>(`${this.baseUrl}/${encodeURIComponent(id)}`);
  }

  createPricing(request: PricingMasterRequest): Observable<ApiResponse<boolean>> {
    return this.http.post<ApiResponse<boolean>>(this.baseUrl, request);
  }

  updatePricing(id: string, request: PricingMasterRequest): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.baseUrl}/${encodeURIComponent(id)}`, request);
  }

  getInsuranceCompanies(): Observable<ApiResponse<PricingCompanyOption[]>> {
    return this.http.get<ApiResponse<PricingCompanyOption[]>>(`${environment.apiUrl}/InsuranceCompany`);
  }

  getAgentClasses(): Observable<ApiResponse<PricingAgentClassOption[]>> {
    return this.http.get<ApiResponse<PricingAgentClassOption[]>>(`${environment.apiUrl}/Admin/view-agentclass`);
  }

  getVehicleTypes(): Observable<ApiResponse<PricingVehicleTypeOption[]>> {
    return this.http.get<ApiResponse<PricingVehicleTypeOption[]>>(`${environment.apiUrl}/vehicle-types`);
  }
}
