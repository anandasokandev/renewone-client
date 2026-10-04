import { inject, Injectable, signal } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse } from '../../models/response.model';
import {
  EnquiryDataResponse,
  EnquiryFilterParams,
  EnquiryItem,
  EnquiryMetrics,
  EnquiryPagedResult,
  EnquiryStatus,
  InsuranceTypeItem,
  VehicleTypeItem,
  CreateVehicleEnquiryPayload,
  UploadDocPayload,
  SubmitVehicleEnquiryPayload,
  SubmitVehicleEnquiryResponseData,
  VehicleDocumentApiItem,
  QuoteItem,
  QuoteFilterParams,
  QuotePagedResult,
  BankPaymentSubmission,
  LedgerPaymentSubmission,
  PolicySummaryData,
  LedgerPaymentDetailsData,
  PolicyQrDetailsData,
  SubmitPolicyRequestPayload,
  QuotePaymentSummaryData,
  PolicyPreviewData,
  AgentEnquiryDetailsData,
} from '../../models/enquiry.model';

const INITIAL_ENQUIRIES: EnquiryItem[] = [];

export const PROGRESSIVE_STATUS_SEQUENCE: EnquiryStatus[] = [
  'Created',
  'Submitted',
  'QuoteInProgress',
  'Quoted',
  'PaymentVerificationPending',
  'PolicyInProgress',
  'PolicyIssued',
];

export const STATUS_SEQUENCE: EnquiryStatus[] = [
  'Created',
  'Submitted',
  'QuoteInProgress',
  'Quoted',
  'PaymentVerificationPending',
  'PolicyInProgress',
  'PolicyIssued',
  'Cancelled',
];

@Injectable({
  providedIn: 'root',
})
export class EnquiryService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/insurance-types`;

  private enquiriesSignal = signal<EnquiryItem[]>(this.loadInitial());

  readonly enquiries = this.enquiriesSignal.asReadonly();

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

  private getAuthHeadersForFormData(): HttpHeaders {
    const token = sessionStorage.getItem('token');
    let headers = new HttpHeaders();
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }
    return headers;
  }

  getInsuranceTypes(): Observable<ApiResponse<InsuranceTypeItem[]>> {
    return this.http.get<ApiResponse<InsuranceTypeItem[]>>(this.apiUrl, {
      headers: this.getAuthHeaders(),
    });
  }

  getVehicleTypes(): Observable<ApiResponse<VehicleTypeItem[]>> {
    return this.http.get<ApiResponse<VehicleTypeItem[]>>(`${environment.apiUrl}/vehicle-types`, {
      headers: this.getAuthHeaders(),
    });
  }

  createVehicleEnquiry(payload: CreateVehicleEnquiryPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/VehicleEnquiry/create-vehicle-enquiry`,
      payload,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  uploadDocument(payload: UploadDocPayload): Observable<ApiResponse<string>> {
    const formData = new FormData();
    formData.append('EnquiryId', payload.enquiryId);
    formData.append('DocType', payload.docType);
    formData.append('DocSide', payload.docSide);
    formData.append('File', payload.file, payload.file.name);

    return this.http.post<ApiResponse<string>>(
      `${environment.apiUrl}/VehicleEnquiry/upload-docs`,
      formData,
      {
        headers: this.getAuthHeadersForFormData(),
      }
    );
  }

  submitVehicleEnquiry(payload: SubmitVehicleEnquiryPayload): Observable<ApiResponse<SubmitVehicleEnquiryResponseData>> {
    return this.http.post<ApiResponse<SubmitVehicleEnquiryResponseData>>(
      `${environment.apiUrl}/VehicleEnquiry/submit-vehicle-enquiry`,
      payload,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getVehicleDocuments(enquiryId: string): Observable<ApiResponse<VehicleDocumentApiItem[]>> {
    return this.http.get<ApiResponse<VehicleDocumentApiItem[]>>(
      `${environment.apiUrl}/VehicleEnquiry/${enquiryId}/documents`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getVehicleQuotes(params: QuoteFilterParams): Observable<ApiResponse<QuotePagedResult>> {
    let httpParams = new HttpParams().set('EnquiryId', params.enquiryId);

    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('Search', params.search.trim());
    }
    if (params.sortBy && params.sortBy.trim()) {
      httpParams = httpParams.set('SortBy', params.sortBy.trim());
    }
    if (params.sortDescending !== undefined) {
      httpParams = httpParams.set('SortDescending', params.sortDescending.toString());
    }
    if (params.pageNumber) {
      httpParams = httpParams.set('PageNumber', params.pageNumber.toString());
    }
    if (params.pageSize) {
      httpParams = httpParams.set('PageSize', params.pageSize.toString());
    }

    return this.http.get<ApiResponse<QuotePagedResult>>(
      `${environment.apiUrl}/VehicleEnquiry/quotes`,
      {
        headers: this.getAuthHeaders(),
        params: httpParams,
      }
    );
  }

  submitQuoteSelection(enquiryId: string, quoteId: string): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/VehicleEnquiry/${enquiryId}/quotes/${quoteId}/submit`,
      {},
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  submitPolicyRequest(payload: SubmitPolicyRequestPayload): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/VehicleEnquiry/submit-policy-request`,
      payload,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  submitBankPayment(payload: BankPaymentSubmission): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/VehicleEnquiry/${payload.enquiryId}/quotes/${payload.quoteId}/payment/bank`,
      payload,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  submitLedgerPayment(payload: LedgerPaymentSubmission): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(
      `${environment.apiUrl}/VehicleEnquiry/${payload.enquiryId}/quotes/${payload.quoteId}/payment/ledger`,
      payload,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getPolicySummary(enquiryId: string): Observable<ApiResponse<PolicySummaryData>> {
    return this.http.get<ApiResponse<PolicySummaryData>>(
      `${environment.apiUrl}/Enquiry/admin/policy-summary/${enquiryId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getLedgerPaymentDetails(enquiryId: string): Observable<ApiResponse<LedgerPaymentDetailsData>> {
    return this.http.get<ApiResponse<LedgerPaymentDetailsData>>(
      `${environment.apiUrl}/Enquiry/admin/ledger-payment-details/${enquiryId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getPolicyQrDetails(enquiryId: string): Observable<ApiResponse<PolicyQrDetailsData>> {
    return this.http.get<ApiResponse<PolicyQrDetailsData>>(
      `${environment.apiUrl}/PolicyPayment/${enquiryId}/qr`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getQuotePaymentSummary(enquiryId: string): Observable<ApiResponse<QuotePaymentSummaryData | null>> {
    return this.http.get<ApiResponse<QuotePaymentSummaryData | null>>(
      `${environment.apiUrl}/Enquiry/admin/quote-summary/${enquiryId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getPolicyPreview(enquiryId: string): Observable<ApiResponse<PolicyPreviewData>> {
    return this.http.get<ApiResponse<PolicyPreviewData>>(
      `${environment.apiUrl}/Enquiry/agent/policy-preview/${enquiryId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getAgentEnquiryDetails(enquiryId: string): Observable<ApiResponse<AgentEnquiryDetailsData>> {
    return this.http.get<ApiResponse<AgentEnquiryDetailsData>>(
      `${environment.apiUrl}/Enquiry/agent/enquiry-details/${enquiryId}`,
      {
        headers: this.getAuthHeaders(),
      }
    );
  }

  getAgentEnquiries(
    params: EnquiryFilterParams = {}
  ): Observable<ApiResponse<EnquiryDataResponse>> {
    let httpParams = new HttpParams();

    if (params.search && params.search.trim()) {
      httpParams = httpParams.set('Search', params.search.trim());
    }

    if (params.insuranceTypeId && params.insuranceTypeId !== 'All') {
      httpParams = httpParams.set('InsuranceTypeId', params.insuranceTypeId);
    }

    if (params.vehicleTypeId && params.vehicleTypeId !== 'All') {
      httpParams = httpParams.set('VehicleTypeId', params.vehicleTypeId);
    }

    if (params.enquiryStatus && params.enquiryStatus !== 'All') {
      httpParams = httpParams.set('EnquiryStatus', params.enquiryStatus);
    }

    if (params.agentId && params.agentId !== 'All') {
      httpParams = httpParams.set('AgentId', params.agentId);
    }

    if (params.dateFilter !== undefined && params.dateFilter !== null) {
      httpParams = httpParams.set('DateFilter', params.dateFilter.toString());
    }

    if (params.fromDate) {
      httpParams = httpParams.set('FromDate', params.fromDate);
    }

    if (params.toDate) {
      httpParams = httpParams.set('ToDate', params.toDate);
    }

    if (params.sortDirection) {
      httpParams = httpParams.set('SortDirection', params.sortDirection);
    }

    if (params.pageNumber) {
      httpParams = httpParams.set('PageNumber', params.pageNumber.toString());
    }

    if (params.pageSize) {
      httpParams = httpParams.set('PageSize', params.pageSize.toString());
    }

    return this.http.get<ApiResponse<EnquiryDataResponse>>(
      `${environment.apiUrl}/Enquiry/agent/enquiries`,
      {
        headers: this.getAuthHeaders(),
        params: httpParams,
      }
    );
  }

  readonly staffMembers: string[] = [];

  readonly insuranceTypes = [
    'Vehicle Insurance',
    'Commercial Auto',
    'General Liability',
    'Commercial Property',
    'Cyber Risk & D&O',
    'Workers Compensation',
    'Marine & Inland Cargo',
    'Builder Risk',
    'Product Liability',
  ];

  readonly vehicleTypes = [
    'Two Wheeler',
    'Private Car',
    'Commercial Vehicle',
    'Heavy Goods Vehicle',
    'Passenger Vehicle (Bus/Taxi)',
    'Electric Vehicle (EV)',
  ];

  private normalizeStatus(st: any): EnquiryStatus {
    if (st === 1 || st === 'Created') return 'Created';
    if (st === 2 || st === 'Submitted') return 'Submitted';
    if (st === 3 || st === 'QuoteInProgress') return 'QuoteInProgress';
    if (st === 4 || st === 'Quoted') return 'Quoted';
    if (st === 5 || st === 'PaymentVerificationPending') return 'PaymentVerificationPending';
    if (st === 6 || st === 'PolicyInProgress' || st === 'Coverage') return 'PolicyInProgress';
    if (st === 7 || st === 'PolicyIssued' || st === 'Issued') return 'PolicyIssued';
    if (st === 8 || st === 'Cancelled') return 'Cancelled';
    return 'Submitted';
  }

  private loadInitial(): EnquiryItem[] {
    const saved = localStorage.getItem('r1_enquiries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize statuses of cached items
          return parsed.map(item => ({
            ...item,
            status: this.normalizeStatus(item.status),
          }));
        }
      } catch {
        // fallback
      }
    }
    return INITIAL_ENQUIRIES;
  }

  private save(list: EnquiryItem[]): void {
    this.enquiriesSignal.set(list);
    try {
      localStorage.setItem('r1_enquiries', JSON.stringify(list));
    } catch {
      // storage unavailable
    }
  }

  advanceStatus(id: string): EnquiryStatus | null {
    const currentList = this.enquiriesSignal();
    const target = currentList.find(e => e.id === id);
    if (!target) return null;
    if (target.status === 'Cancelled' || target.status === 'PolicyIssued') {
      return target.status;
    }

    const currentIndex = PROGRESSIVE_STATUS_SEQUENCE.indexOf(target.status);
    if (currentIndex >= 0 && currentIndex < PROGRESSIVE_STATUS_SEQUENCE.length - 1) {
      const nextStatus = PROGRESSIVE_STATUS_SEQUENCE[currentIndex + 1];
      const updated = currentList.map(e =>
        e.id === id ? { ...e, status: nextStatus, lastUpdated: new Date().toISOString() } : e
      );
      this.save(updated);
      return nextStatus;
    }
    return target.status;
  }

  updateStatus(id: string, newStatus: EnquiryStatus): void {
    const updated = this.enquiriesSignal().map(e =>
      e.id === id ? { ...e, status: newStatus, lastUpdated: new Date().toISOString() } : e
    );
    this.save(updated);
  }

  assignStaff(id: string, staffName: string): void {
    const updated = this.enquiriesSignal().map(e =>
      e.id === id
        ? {
          ...e,
          assignedStaff: staffName,
          assignedStaffRole: (staffName === 'Alex Morgan' ? 'Agent' : 'Staff') as 'Agent' | 'Staff',
          lastUpdated: new Date().toISOString(),
        }
        : e
    );
    this.save(updated);
  }

  createEnquiry(data: {
    customerName: string;
    customerPhone: string;
    customerEmail?: string;
    insuranceType: string;
    vehicleType?: string;
    policyType?: string;
    vehicleNumber?: string;
    status?: EnquiryStatus;
    coverageAmount?: string;
    premiumEstimated?: string;
    assignedStaff?: string;
    notes?: string;
  }): EnquiryItem {
    const nextNumber = 1050 + this.enquiriesSignal().length;
    const newEnquiry: EnquiryItem = {
      id: `enq-${Date.now()}`,
      enquiryId: `ENQ-2026-${nextNumber}`,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      customerEmail: data.customerEmail || '',
      insuranceType: data.insuranceType,
      vehicleType: data.vehicleType,
      policyType: data.policyType,
      vehicleNumber: data.vehicleNumber,
      status: data.status || 'Created',
      coverageAmount: data.coverageAmount || '',
      premiumEstimated: data.premiumEstimated || '',
      assignedStaff: data.assignedStaff || 'Unassigned',
      assignedStaffRole: 'Staff',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      notes: data.notes || '',
    };

    const updated = [newEnquiry, ...this.enquiriesSignal()];
    this.save(updated);
    return newEnquiry;
  }

  deleteEnquiry(id: string): void {
    const updated = this.enquiriesSignal().filter(e => e.id !== id);
    this.save(updated);
  }

  resetToDefault(): void {
    this.save(INITIAL_ENQUIRIES);
  }
}
