import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import { PagedResult } from '../../models/qr.model';
import {
  BankAccountFilterParams,
  BankAccountItem,
  CreateBankAccountRequest,
} from '../../models/bank-account.model';

@Injectable({
  providedIn: 'root',
})
export class BankAccountService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getBankAccounts(
    params: BankAccountFilterParams = {}
  ): Observable<ApiResponse<PagedResult<BankAccountItem>>> {
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

  toggleBankAccountStatus(id: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/bank-accounts/${id}/toggle-status`, {});
  }

  createBankAccount(payload: CreateBankAccountRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/bank-accounts`, payload);
  }
}

