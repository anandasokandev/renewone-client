import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import {
  BankAccountItem,
  CreateQrMappingRequest,
  CreateUpiMasterRequest,
  PagedResult,
  QrFilterParams,
  QrMappingItem,
  UpiMasterItem,
} from '../../models/qr.model';
import { InsuranceTypeItem, VehicleTypeItem } from '../../models/enquiry.model';

@Injectable({
  providedIn: 'root',
})
export class QrService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getQrMasters(params: QrFilterParams = {}): Observable<ApiResponse<PagedResult<UpiMasterItem>>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('PageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('PageSize', params.pageSize.toString());
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('Search', params.search.trim());
    }

    return this.http.get<ApiResponse<PagedResult<UpiMasterItem>>>(
      `${this.baseUrl}/qr-master`,
      { params: httpParams }
    );
  }

  createQrMaster(payload: CreateUpiMasterRequest): Observable<ApiResponse<string>> {
    return this.http.post<ApiResponse<string>>(`${this.baseUrl}/qr-master`, payload);
  }

  getBankAccounts(params: QrFilterParams = {}): Observable<ApiResponse<PagedResult<BankAccountItem>>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('PageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('PageSize', params.pageSize.toString());
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('Search', params.search.trim());
    }

    return this.http.get<ApiResponse<PagedResult<BankAccountItem>>>(
      `${this.baseUrl}/bank-accounts`,
      { params: httpParams }
    );
  }

  getQrMappings(params: QrFilterParams = {}): Observable<ApiResponse<PagedResult<QrMappingItem>>> {
    let httpParams = new HttpParams();

    if (params.pageNumber) {
      httpParams = httpParams.set('PageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('PageSize', params.pageSize.toString());
    }
    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('Search', params.search.trim());
    }

    return this.http.get<ApiResponse<PagedResult<QrMappingItem>>>(
      `${this.baseUrl}/qr-mappings`,
      { params: httpParams }
    );
  }

  createQrMapping(payload: CreateQrMappingRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/qr-mappings`, payload);
  }

  getInsuranceTypes(): Observable<ApiResponse<InsuranceTypeItem[]>> {
    return this.http.get<ApiResponse<InsuranceTypeItem[]>>(`${this.baseUrl}/insurance-types`);
  }

  getVehicleTypes(): Observable<ApiResponse<VehicleTypeItem[]>> {
    return this.http.get<ApiResponse<VehicleTypeItem[]>>(`${this.baseUrl}/vehicle-types`);
  }

  toggleQrMasterStatus(id: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/qr-master/${id}/toggle-status`, {});
  }

  toggleQrMappingStatus(id: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/qr-mappings/${id}/toggle-status`, {});
  }
}

