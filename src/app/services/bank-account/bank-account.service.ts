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
  UpdateBankAccountRequest,
  BankTransactionFilterParams,
  BankTransactionResponse,
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

  getBankAccount(id: string): Observable<ApiResponse<BankAccountItem>> {
    return this.http.get<ApiResponse<BankAccountItem>>(`${this.baseUrl}/bank-accounts/${id}`);
  }

  getBankTransactions(
    filters: BankTransactionFilterParams
  ): Observable<ApiResponse<BankTransactionResponse>> {
    let params = new HttpParams()
      .set('BankAccountId', filters.bankAccountId)
      .set('PageNumber', String(filters.pageNumber ?? 1))
      .set('PageSize', String(filters.pageSize ?? 25))
      .set('SortBy', filters.sortBy ?? 'date')
      .set('SortOrder', filters.sortOrder ?? 'desc');

    if (filters.search?.trim()) params = params.set('Search', filters.search.trim());
    if (filters.transactionType) params = params.set('TransactionType', filters.transactionType);
    if (filters.category) params = params.set('Category', filters.category);
    if (filters.userId) params = params.set('UserId', filters.userId);
    if (filters.vendorId) params = params.set('VendorId', filters.vendorId);
    if (filters.policyPaymentId) params = params.set('PolicyPaymentId', filters.policyPaymentId);
    if (filters.fromDate) params = params.set('FromDate', filters.fromDate);
    if (filters.toDate) params = params.set('ToDate', filters.toDate);

    return this.http.get<ApiResponse<BankTransactionResponse>>(
      `${this.baseUrl}/bank-accounts/transactions`, { params }
    );
  }

  toggleBankAccountStatus(id: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.baseUrl}/bank-accounts/${id}/status`, null);
  }

  updateBankAccount(id: string, payload: UpdateBankAccountRequest): Observable<ApiResponse<string>> {
    return this.http.put<ApiResponse<string>>(`${this.baseUrl}/bank-accounts/${id}`, payload);
  }

  createBankAccount(payload: CreateBankAccountRequest): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.baseUrl}/bank-accounts`, payload);
  }
}

