import { CommonModule } from '@angular/common';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';

interface ReportDefinition {
  type: number;
  name: string;
  description: string;
  filters: { key: string; label: string; type: string; multiple?: boolean }[];
  columns: { key: string; label: string }[];
  metrics: { key: string; label: string; format: string }[];
}
interface ReportResult {
  reportType: number;
  metrics: { key: string; label: string; value: unknown; format: string }[];
  columns: { key: string; label: string }[];
  data: { items: Record<string, unknown>[]; pageNumber: number; pageSize: number; totalRecords: number; totalPages: number };
}

@Component({
  selector: 'app-admin-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-reports.html',
  styleUrl: './admin-reports.css',
})
export class AdminReports implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly apiUrl = `${environment.apiUrl}/EnquiryReports`;

  readonly definitions = signal<ReportDefinition[]>([]);
  readonly selectedType = signal<number | null>(null);
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly filterValues = signal<Record<string, string>>({});
  readonly pageNumber = signal(1);
  readonly pageSize = signal(25);
  readonly result = signal<ReportResult | null>(null);
  readonly loadingDefinitions = signal(false);
  readonly loadingReport = signal(false);
  readonly exporting = signal<number | null>(null);
  readonly error = signal<string | null>(null);
  readonly notice = signal<string | null>(null);
  readonly selectedDefinition = computed(() => this.definitions().find((item) => item.type === this.selectedType()) ?? null);

  ngOnInit(): void { this.loadDefinitions(); }

  loadDefinitions(): void {
    this.loadingDefinitions.set(true);
    this.error.set(null);
    this.http.get<ReportDefinition[]>(`${this.apiUrl}/definitions`)
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loadingDefinitions.set(false)))
      .subscribe({
        next: (items) => {
          this.definitions.set(items ?? []);
          if (!this.selectedType() && items?.length) this.selectedType.set(items[0].type);
        },
        error: (err) => this.error.set(this.errorText(err, 'Could not load report definitions.')),
      });
  }

  generateReport(page = 1): void {
    const reportType = this.selectedType();
    if (!reportType) return;
    this.pageNumber.set(page);
    this.loadingReport.set(true);
    this.error.set(null);
    this.notice.set(null);
    this.http.post<ReportResult>(`${this.apiUrl}/generate`, this.requestBody(page))
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loadingReport.set(false)))
      .subscribe({
        next: (data) => this.result.set(data),
        error: (err) => this.error.set(this.errorText(err, 'Could not generate this report.')),
      });
  }

  exportReport(format: number): void {
    if (!this.selectedType()) return;
    this.exporting.set(format);
    this.error.set(null);
    const params = new HttpParams().set('format', format).set('title', this.selectedDefinition()?.name ?? 'Report');
    this.http.post(`${this.apiUrl}/export`, this.requestBody(1, true), { params, responseType: 'blob' })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.exporting.set(null)))
      .subscribe({
        next: (blob) => {
          const extension = format === 1 ? 'csv' : format === 2 ? 'xlsx' : 'pdf';
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${this.fileName(this.selectedDefinition()?.name ?? 'report')}.${extension}`;
          link.click();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          this.notice.set('Report downloaded.');
        },
        error: (err) => this.error.set(this.errorText(err, 'Could not export this report.')),
      });
  }

  changeReport(type: number): void {
    this.selectedType.set(Number(type));
    this.result.set(null);
    this.error.set(null);
    this.filterValues.set({});
  }

  filterValue(key: string): string { return this.filterValues()[key] ?? ''; }

  setFilterValue(key: string, value: string): void {
    this.filterValues.update((filters) => ({ ...filters, [key]: value }));
  }

  formatMetric(value: unknown, format: string): string {
    if (value === null || value === undefined) return '—';
    if (format.toLowerCase() === 'currency') {
      const amount = Number(value);
      return Number.isFinite(amount) ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount) : String(value);
    }
    if (format.toLowerCase() === 'percentage') return `${value}%`;
    return typeof value === 'object' ? JSON.stringify(value) : String(value);
  }

  cellValue(row: Record<string, unknown>, key: string): string {
    const value = row[key];
    if (value === null || value === undefined || value === '') return '—';
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  private requestBody(page: number, exportAll = false): object {
    const values = this.filterValues();
    const filter: Record<string, unknown> = {
      FromDate: this.fromDate() || null,
      ToDate: this.toDate() || null,
    };
    const arrayFilters: Record<string, string> = {
      status: 'Statuses', employee: 'EmployeeIds', agency: 'AgencyIds', insuranceCompany: 'InsuranceCompanyIds',
      insuranceType: 'InsuranceTypeIds', vehicleType: 'VehicleTypeIds', cancelledBy: 'CancelledByIds',
      cancellationReason: 'CancellationReasons', pendingStage: 'PendingStageIds',
      missingDocument: 'MissingDocumentIds', ageing: 'AgeingRanges',
    };
    for (const [key, property] of Object.entries(arrayFilters)) {
      const selected = this.parseList(values[key]);
      if (selected.length) filter[property] = ['PendingStageIds', 'MissingDocumentIds'].includes(property)
        ? selected.map(Number).filter(Number.isFinite)
        : selected;
    }

    const cancellationFrom = values['cancellationDateRange_from'];
    const cancellationTo = values['cancellationDateRange_to'];
    if (cancellationFrom) filter['CancellationFromDate'] = cancellationFrom;
    if (cancellationTo) filter['CancellationToDate'] = cancellationTo;
    const convertedFrom = values['convertedDateRange_from'];
    const convertedTo = values['convertedDateRange_to'];
    if (convertedFrom) filter['ConvertedFromDate'] = convertedFrom;
    if (convertedTo) filter['ConvertedToDate'] = convertedTo;
    const rangeMappings: Record<string, [string, string]> = {
      profitRange: ['MinProfit', 'MaxProfit'], marginRange: ['MinMargin', 'MaxMargin'],
    };
    for (const [key, [minKey, maxKey]] of Object.entries(rangeMappings)) {
      const min = values[`${key}_min`];
      const max = values[`${key}_max`];
      if (min !== undefined && min !== '') filter[minKey] = Number(min);
      if (max !== undefined && max !== '') filter[maxKey] = Number(max);
    }
    if (values['groupBy']) filter['GroupBy'] = values['groupBy'];
    if (values['enquiryNumber']) filter['EnquiryNumber'] = values['enquiryNumber'].trim();
    if (values['customerName']) filter['CustomerName'] = values['customerName'].trim();
    if (values['vehicleNumber']) filter['VehicleNumber'] = values['vehicleNumber'].trim();

    return {
      ReportType: this.selectedType(),
      PageNumber: page,
      PageSize: this.pageSize(),
      ExportAll: exportAll,
      Filter: filter,
    };
  }

  private parseList(value?: string): string[] {
    return (value ?? '').split(',').map((item) => item.trim()).filter(Boolean);
  }

  private fileName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'report';
  }

  private errorText(err: any, fallback: string): string {
    return err?.error?.message || (typeof err?.error === 'string' ? err.error : null) || fallback;
  }
}
