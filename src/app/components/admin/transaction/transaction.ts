import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { BankAccountItem, BankTransactionFilterParams, BankTransactionItem, BankTransactionSummary, CreateManualBankTransactionRequest } from '../../../models/bank-account.model';
import { BankAccountService } from '../../../services/bank-account/bank-account.service';

type ExportFormat = 'csv' | 'excel' | 'pdf';

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './transaction.html',
  styleUrl: './transaction.css',
})
export class Transaction implements OnInit {
  private readonly service = inject(BankAccountService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly formBuilder = inject(FormBuilder);
  private requestSequence = 0;

  readonly accounts = signal<BankAccountItem[]>([]);
  readonly transactions = signal<BankTransactionItem[]>([]);
  readonly summary = signal<BankTransactionSummary | null>(null);
  readonly loading = signal(false);
  readonly accountsLoading = signal(false);
  readonly submitting = signal(false);
  readonly exporting = signal<ExportFormat | null>(null);
  readonly error = signal('');
  readonly notice = signal('');
  readonly page = signal(1);
  readonly pageSize = signal(25);
  readonly totalPages = signal(0);
  readonly totalRecords = signal(0);

  readonly search = signal('');
  readonly bankAccountId = signal('');
  readonly transactionType = signal('');
  readonly category = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly minAmount = signal('');
  readonly maxAmount = signal('');
  readonly userIdFilter = signal('');
  readonly vendorIdFilter = signal('');
  readonly policyPaymentIdFilter = signal('');
  readonly transactionIdFilter = signal('');
  readonly enquiryIdFilter = signal('');
  readonly employeeIdFilter = signal('');
  readonly manualModalOpen = signal(false);
  readonly sortBy = signal<'date' | 'amount'>('date');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');
  readonly manualForm = this.formBuilder.group({
    bankAccountId: ['', Validators.required],
    transactionType: ['Debit' as 'Credit' | 'Debit', Validators.required],
    amount: [null as number | null, [Validators.required, Validators.min(0.01)]],
    category: ['Manual adjustment', [Validators.required, Validators.maxLength(80)]],
    description: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(500)]],
    transactionDate: [this.indiaToday(), Validators.required],
  });
  readonly categories = [
    'PolicyPayment', 'PolicyPaymentRefund', 'VendorPayment', 'Salary', 'Manual adjustment',
    'OpeningBalance', 'BankTransfer', 'PolicyAdjustment', 'CommissionAdjustment', 'Other',
  ];

  ngOnInit(): void {
    this.loadAccounts();
    this.loadTransactions();
  }

  async loadAccounts(): Promise<void> {
    this.accountsLoading.set(true);
    try {
      const first = await firstValueFrom(this.service.getBankAccounts({ pageNumber: 1, pageSize: 100 }));
      if (!first?.isSuccess || !first.data) throw new Error(first?.message || 'Could not load bank accounts.');
      const accounts = [...(first.data.items ?? [])];
      for (let page = 2; page <= (first.data.totalPages ?? 1); page++) {
        const next = await firstValueFrom(this.service.getBankAccounts({ pageNumber: page, pageSize: 100 }));
        if (!next?.isSuccess || !next.data) throw new Error(next?.message || `Could not load bank account page ${page}.`);
        accounts.push(...(next.data.items ?? []));
      }
      this.accounts.set(accounts);
    } catch (err: any) {
      this.error.set(err?.error?.message || err?.message || 'Could not load bank accounts.');
    } finally { this.accountsLoading.set(false); }
  }

  loadTransactions(page = this.page()): void {
    const sequence = ++this.requestSequence;
    this.loading.set(true);
    this.error.set('');
    this.page.set(page);
    this.service.getBankTransactions({ ...this.currentFilters(), pageNumber: page, pageSize: this.pageSize() })
      .pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
        next: (response) => {
          if (sequence !== this.requestSequence) return;
          this.loading.set(false);
          if (!response?.isSuccess || !response.data) {
            this.error.set(response?.message || 'Could not load bank transactions.');
            return;
          }
          const result = response.data;
          this.summary.set(result.summary);
          this.transactions.set(result.transactions.items ?? []);
          this.totalRecords.set(result.transactions.totalRecords ?? 0);
          this.totalPages.set(result.transactions.totalPages ?? 0);
        },
        error: (err) => {
          if (sequence !== this.requestSequence) return;
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Could not load bank transactions.');
        },
      });
  }

  applyFilters(): void {
    this.notice.set('');
    if (this.fromDate() && this.toDate() && this.fromDate() > this.toDate()) {
      this.error.set('Start date must be on or before end date.');
      return;
    }
    const min = Number(this.minAmount());
    const max = Number(this.maxAmount());
    const relatedIds = [this.userIdFilter().trim(), this.vendorIdFilter().trim(), this.policyPaymentIdFilter().trim(), this.transactionIdFilter().trim(), this.enquiryIdFilter().trim(), this.employeeIdFilter().trim()].filter(Boolean);
    const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (relatedIds.some((id) => !guid.test(id))) { this.error.set('Related record IDs must be valid UUIDs.'); return; }
    if ((this.minAmount() && (!Number.isFinite(min) || min < 0)) || (this.maxAmount() && (!Number.isFinite(max) || max < 0))) { this.error.set('Amount filters must be zero or greater.'); return; }
    if (this.minAmount() && this.maxAmount() && min > max) {
      this.error.set('Minimum amount must not exceed maximum amount.');
      return;
    }
    this.page.set(1);
    this.loadTransactions(1);
  }

  resetFilters(): void {
    this.search.set(''); this.bankAccountId.set(''); this.transactionType.set(''); this.category.set('');
    this.fromDate.set(''); this.toDate.set(''); this.minAmount.set(''); this.maxAmount.set(''); this.userIdFilter.set(''); this.vendorIdFilter.set(''); this.policyPaymentIdFilter.set(''); this.transactionIdFilter.set(''); this.enquiryIdFilter.set(''); this.employeeIdFilter.set('');
    this.sortBy.set('date'); this.sortOrder.set('desc'); this.pageSize.set(25);
    this.applyFilters();
  }

  setSort(field: 'date' | 'amount'): void {
    if (this.sortBy() === field) this.sortOrder.set(this.sortOrder() === 'asc' ? 'desc' : 'asc');
    else { this.sortBy.set(field); this.sortOrder.set('desc'); }
    this.loadTransactions(1);
  }

  changePageSize(raw: string): void { this.pageSize.set(Number(raw)); this.loadTransactions(1); }

  saveManualTransaction(): void {
    this.manualForm.markAllAsTouched();
    if (this.manualForm.invalid || this.submitting()) return;
    const value = this.manualForm.getRawValue();
    if (!value.bankAccountId || !value.transactionDate || value.amount == null) return;
    this.submitting.set(true);
    this.notice.set(''); this.error.set('');
    const payload: CreateManualBankTransactionRequest = {
      bankAccountId: value.bankAccountId,
      transactionType: value.transactionType ?? 'Debit',
      amount: Number(value.amount),
      category: value.category?.trim() ?? '',
      description: value.description?.trim() ?? '',
      transactionDate: value.transactionDate,
    };
    this.service.createManualTransaction(payload).pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (response) => {
        this.submitting.set(false);
        if (!response?.isSuccess) { this.error.set(response?.message || 'Transaction could not be recorded.'); return; }
        this.notice.set(response.message || 'Transaction recorded and balance updated.');
        this.manualForm.reset({ bankAccountId: '', transactionType: 'Debit', amount: null, category: 'Manual adjustment', description: '', transactionDate: this.indiaToday() });
        this.loadTransactions(1);
        this.loadAccounts();
      },
      error: (err) => { this.submitting.set(false); this.error.set(err?.error?.message || 'Transaction could not be recorded.'); },
    });
  }

  async exportReport(format: ExportFormat): Promise<void> {
    if (this.exporting()) return;
    const printWindow = format === 'pdf' ? window.open('', '_blank') : null;
    if (format === 'pdf' && !printWindow) { this.error.set('Allow popups to print the PDF report.'); return; }
    this.exporting.set(format); this.error.set('');
    try {
      const rows = await this.fetchAllFilteredTransactions(this.currentFilters());
      if (format === 'csv') this.downloadCsv(rows);
      else if (format === 'excel') this.downloadExcel(rows);
      else this.openPrintableReport(printWindow!, rows);
      this.notice.set(`Detailed ${format.toUpperCase()} report prepared with ${rows.length} transactions.`);
    } catch (err: any) {
      printWindow?.close();
      this.error.set(err?.error?.message || 'The detailed report could not be prepared.');
    } finally { this.exporting.set(null); }
  }

  private async fetchAllFilteredTransactions(filters: BankTransactionFilterParams): Promise<BankTransactionItem[]> {
    const first = await firstValueFrom(this.service.getBankTransactions({ ...filters, pageNumber: 1, pageSize: 100 }));
    if (!first?.isSuccess || !first.data) throw new Error(first?.message || 'No report data returned.');
    const pageData = first.data.transactions;
    const rows = [...(pageData.items ?? [])];
    for (let page = 2; page <= pageData.totalPages; page++) {
      const response = await firstValueFrom(this.service.getBankTransactions({ ...filters, pageNumber: page, pageSize: 100 }));
      if (!response?.isSuccess || !response.data) throw new Error(response?.message || `Could not load report page ${page}.`);
      rows.push(...(response.data.transactions.items ?? []));
    }
    return rows;
  }

  private currentFilters(): BankTransactionFilterParams {
    const userId = this.userIdFilter().trim();
    const vendorId = this.vendorIdFilter().trim();
    const policyPaymentId = this.policyPaymentIdFilter().trim();
    return {
      bankAccountId: this.bankAccountId() || undefined,
      search: this.search().trim() || undefined,
      transactionType: (this.transactionType() || undefined) as 'Credit' | 'Debit' | undefined,
      category: this.category() || undefined,
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      minAmount: this.minAmount() ? Number(this.minAmount()) : undefined,
      maxAmount: this.maxAmount() ? Number(this.maxAmount()) : undefined,
      userId: userId || undefined,
      vendorId: vendorId || undefined,
      policyPaymentId: policyPaymentId || undefined,
      transactionId: this.transactionIdFilter().trim() || undefined,
      enquiryId: this.enquiryIdFilter().trim() || undefined,
      employeeId: this.employeeIdFilter().trim() || undefined,
      sortBy: this.sortBy(), sortOrder: this.sortOrder(),
    };
  }

  private downloadCsv(rows: BankTransactionItem[]): void {
    const summary = this.reportTotals(rows);
    const lines = [
      ['Bank transaction report', this.reportPeriod()].map(this.csvCell).join(','),
      ['Transactions', summary.count, 'Total credits', summary.credits.toFixed(2), 'Total debits', summary.debits.toFixed(2), 'Net flow', (summary.credits - summary.debits).toFixed(2)].map(this.csvCell).join(','),
      [],
      ['Transaction date', 'Bank account', 'Bank', 'Type', 'Amount', 'Category', 'Description', 'Source reference', 'Agency User ID', 'Admin Employee ID', 'Enquiry ID', 'Transaction ID'],
      ...rows.map((row) => [this.dateText(row.transactionDate), this.accountLabel(row.bankAccountId), row.bankName, row.transactionType, row.amount.toFixed(2), row.category, row.description, this.sourceReference(row), row.userId ?? '', row.employeeId ?? '', row.enquiryId ?? '', row.id]),
    ].map((line) => (line as unknown[]).map(this.csvCell).join(','));
    this.downloadFile(`bank-transactions-${this.indiaToday()}.csv`, '\ufeff' + lines.join('\r\n'), 'text/csv;charset=utf-8');
  }

  private downloadExcel(rows: BankTransactionItem[]): void {
    const totals = this.reportTotals(rows);
    const html = `<html><head><meta charset="utf-8"></head><body><h1>Bank transaction report</h1><p>Period: ${this.excelText(this.reportPeriod())}</p><p>Transactions: ${totals.count} | Credits: ${totals.credits.toFixed(2)} | Debits: ${totals.debits.toFixed(2)} | Net flow: ${(totals.credits - totals.debits).toFixed(2)}</p><table border="1"><thead><tr><th>Date</th><th>Account</th><th>Bank</th><th>Type</th><th>Amount</th><th>Category</th><th>Description</th><th>Source reference</th><th>Agency User ID</th><th>Admin Employee ID</th><th>Enquiry ID</th><th>Transaction ID</th></tr></thead><tbody>${rows.map((row) => `<tr><td>${this.excelText(this.dateText(row.transactionDate))}</td><td>${this.excelText(this.accountLabel(row.bankAccountId))}</td><td>${this.excelText(row.bankName)}</td><td>${this.excelText(row.transactionType)}</td><td>${row.amount.toFixed(2)}</td><td>${this.excelText(row.category)}</td><td>${this.excelText(row.description)}</td><td>${this.excelText(this.sourceReference(row))}</td><td>${this.excelText(row.userId ?? '')}</td><td>${this.excelText(row.employeeId ?? '')}</td><td>${this.excelText(row.enquiryId ?? '')}</td><td>${this.excelText(row.id)}</td></tr>`).join('')}</tbody></table></body></html>`;
    this.downloadFile(`bank-transactions-${this.indiaToday()}.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
  }

  private openPrintableReport(target: Window, rows: BankTransactionItem[]): void {
    const totals = this.reportTotals(rows);
    const table = rows.map((row) => `<tr><td>${this.html(this.dateText(row.transactionDate))}</td><td>${this.html(this.accountLabel(row.bankAccountId))}<br>${this.html(row.bankName)}</td><td>${this.html(row.transactionType)}</td><td>${row.amount.toFixed(2)}</td><td>${this.html(row.category)}</td><td>${this.html(row.description)}</td><td>${this.html(this.sourceReference(row))}</td><td>${this.html(row.userId ?? '')}</td><td>${this.html(row.employeeId ?? '')}</td><td>${this.html(row.enquiryId ?? '')}</td></tr>`).join('');
    target.document.write(`<!doctype html><html><head><title>Bank transactions report</title><style>body{font:11px Arial,sans-serif;color:#161616;margin:24px}h1{font-size:20px}p{color:#525252}.summary{padding:12px;background:#f4f4f4;margin:12px 0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #ccc;text-align:left;padding:6px;vertical-align:top}th{background:#eee}td:nth-child(4){text-align:right}@media print{@page{size:landscape;margin:12mm}tr{break-inside:avoid}}</style></head><body><h1>Bank transaction report</h1><p>Period / filters: ${this.html(this.reportPeriod())}</p><div class="summary">Transactions: ${totals.count} · Credits: ${totals.credits.toFixed(2)} · Debits: ${totals.debits.toFixed(2)} · Net flow: ${(totals.credits - totals.debits).toFixed(2)}</div><table><thead><tr><th>Date</th><th>Bank account</th><th>Type</th><th>Amount</th><th>Category</th><th>Description</th><th>Source reference</th><th>Agency User ID</th><th>Admin Employee ID</th><th>Enquiry ID</th></tr></thead><tbody>${table}</tbody></table><script>window.onload=()=>window.print()</script></body></html>`);
    target.document.close();
  }

  private reportTotals(rows: BankTransactionItem[]) {
    return { count: rows.length, credits: rows.filter((r) => r.transactionType.toLowerCase() === 'credit').reduce((s, r) => s + r.amount, 0), debits: rows.filter((r) => r.transactionType.toLowerCase() === 'debit').reduce((s, r) => s + r.amount, 0) };
  }
  accountLabel(id: string): string { const a = this.accounts().find((item) => item.id === id); return a ? `${a.accountName} · ${a.accountNumber}` : id; }
  sourceReference(row: BankTransactionItem): string { if (row.policyPaymentId) return `Policy payment · ${row.policyPaymentId.slice(0, 8).toUpperCase()}`; if (row.vendorId) return `Vendor · ${row.vendorId.slice(0, 8).toUpperCase()}`; if (row.salaryId) return `Salary · ${row.salaryId.slice(0, 8).toUpperCase()}`; if (row.userId) return `User · ${row.userId.slice(0, 8).toUpperCase()}`; return 'Manual / system'; }
  private reportPeriod(): string { return `${this.fromDate() || 'All dates'} to ${this.toDate() || 'Today'} · ${this.bankAccountId() ? this.accountLabel(this.bankAccountId()) : 'All bank accounts'}`; }
  private csvCell(value: unknown): string { let text = String(value ?? ''); if (/^[=+@\-]/.test(text)) text = `'${text}`; return `"${text.replace(/"/g, '""')}"`; }
  private html(value: unknown): string { return String(value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!); }
  private excelText(value: unknown): string { const text = String(value ?? ''); return this.html(/^[=+@\-]/.test(text) ? `'${text}` : text); }
  private downloadFile(name: string, data: string, type: string): void { const url = URL.createObjectURL(new Blob([data], { type })); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1500); }
  private dateText(value: string): string { return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)); }
  private indiaToday(): string { const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''; return `${part('year')}-${part('month')}-${part('day')}`; }
}
