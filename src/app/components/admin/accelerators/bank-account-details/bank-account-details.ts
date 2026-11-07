import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  BankAccountItem,
  BankTransactionFilterParams,
  BankTransactionItem,
  BankTransactionSummary,
} from '../../../../models/bank-account.model';
import { BankAccountService } from '../../../../services/bank-account/bank-account.service';

type DatePreset = 'month' | 'today' | '7days' | '30days' | 'year' | 'custom';

@Component({
  selector: 'app-bank-account-details',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './bank-account-details.html',
  styleUrl: './bank-account-details.css',
})
export class BankAccountDetails implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly bankAccountService = inject(BankAccountService);
  private readonly destroyRef = inject(DestroyRef);
  private requestSequence = 0;

  readonly account = signal<BankAccountItem | null>(null);
  readonly periodSummary = signal<BankTransactionSummary | null>(null);
  readonly transactions = signal<BankTransactionItem[]>([]);
  readonly isLoading = signal(true);
  readonly errorMessage = signal<string | null>(null);
  readonly filterError = signal<string | null>(null);
  readonly pageNumber = signal(1);
  readonly pageSize = signal(25);
  readonly totalRecords = signal(0);
  readonly totalPages = signal(0);

  readonly search = signal('');
  readonly transactionType = signal('');
  readonly category = signal('');
  readonly fromDate = signal('');
  readonly toDate = signal('');
  readonly datePreset = signal<DatePreset>('month');
  readonly sortBy = signal<'date' | 'amount'>('date');
  readonly sortOrder = signal<'asc' | 'desc'>('desc');
  readonly userId = signal('');
  readonly vendorId = signal('');
  readonly policyPaymentId = signal('');

  readonly derivedBalance = computed(() => this.account()?.ledgerDerivedBalance ?? null);
  readonly balanceVariance = computed(() => this.account()?.balanceVariance ?? null);
  readonly hasBalanceVariance = computed(() => Math.abs(this.balanceVariance() ?? 0) >= 0.01);
  readonly allTimeSummary = computed(() => {
    const account = this.account();
    if (!account) return null;
    return {
      totalCredited: account.ledgerTotalCredited ?? 0,
      totalDebited: account.ledgerTotalDebited ?? 0,
      totalTransactions: account.ledgerTransactionCount ?? 0,
    };
  });
  readonly periodFlowStyle = computed(() => {
    const summary = this.periodSummary();
    if (!summary) return 'conic-gradient(#e0e0e0 0deg 360deg)';
    const credit = Math.max(0, summary.totalCredited);
    const debit = Math.max(0, summary.totalDebited);
    const total = credit + debit;
    if (!total) return 'conic-gradient(#e0e0e0 0deg 360deg)';
    const creditEnd = (credit / total) * 360;
    return `conic-gradient(#24a148 0deg ${creditEnd}deg, #da1e28 ${creditEnd}deg 360deg)`;
  });

  ngOnInit(): void {
    const today = this.indiaToday();
    this.fromDate.set(`${today.slice(0, 7)}-01`);
    this.toDate.set(today);
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMessage.set('A bank account ID is required to view account details.');
      this.isLoading.set(false);
      return;
    }
    this.load(id);
  }

  load(accountId = this.route.snapshot.paramMap.get('id') ?? ''): void {
    if (!accountId) return;
    const requestId = ++this.requestSequence;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    forkJoin({
      account: this.bankAccountService.getBankAccount(accountId),
      filtered: this.bankAccountService.getBankTransactions(this.buildFilter(accountId)),
    })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          if (requestId === this.requestSequence) this.isLoading.set(false);
        })
      )
      .subscribe({
        next: ({ account, filtered }) => {
          if (requestId !== this.requestSequence) return;
          if (!account.isSuccess || !account.data || !filtered.isSuccess || !filtered.data) {
            this.errorMessage.set(account.message || filtered.message || 'Unable to load bank account details.');
            return;
          }
          this.account.set(account.data);
          this.periodSummary.set(filtered.data.summary);
          this.transactions.set(filtered.data.transactions.items ?? []);
          this.pageNumber.set(filtered.data.transactions.pageNumber ?? 1);
          this.totalRecords.set(filtered.data.transactions.totalRecords ?? 0);
          this.totalPages.set(filtered.data.transactions.totalPages ?? 0);
        },
        error: (error) => {
          if (requestId !== this.requestSequence) return;
          this.errorMessage.set(error?.error?.message || 'Unable to load bank account details. Please retry.');
        },
      });
  }

  applyFilters(): void {
    this.filterError.set(null);
    if (this.fromDate() && this.toDate() && this.fromDate() > this.toDate()) {
      this.filterError.set('The start date must be on or before the end date.');
      return;
    }
    const guid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if ([this.userId(), this.vendorId(), this.policyPaymentId()].some((value) => value.trim() && !guid.test(value.trim()))) {
      this.filterError.set('Related record filters must contain a valid UUID.');
      return;
    }
    this.pageNumber.set(1);
    this.load();
  }

  resetFilters(): void {
    const today = this.indiaToday();
    this.search.set('');
    this.transactionType.set('');
    this.category.set('');
    this.userId.set('');
    this.vendorId.set('');
    this.policyPaymentId.set('');
    this.fromDate.set(`${today.slice(0, 7)}-01`);
    this.toDate.set(today);
    this.datePreset.set('month');
    this.sortBy.set('date');
    this.sortOrder.set('desc');
    this.pageSize.set(25);
    this.pageNumber.set(1);
    this.applyFilters();
  }

  setDatePreset(preset: DatePreset): void {
    this.datePreset.set(preset);
    if (preset === 'custom') return;
    const today = this.indiaToday();
    const end = new Date(`${today}T00:00:00+05:30`);
    let start = new Date(end);
    switch (preset) {
      case 'today': break;
      case '7days': start.setUTCDate(start.getUTCDate() - 6); break;
      case '30days': start.setUTCDate(start.getUTCDate() - 29); break;
      case 'year': start = new Date(`${today.slice(0, 4)}-01-01T00:00:00+05:30`); break;
      default: start = new Date(`${today.slice(0, 7)}-01T00:00:00+05:30`); break;
    }
    this.fromDate.set(this.formatUtcAsIndiaDate(start));
    this.toDate.set(today);
  }

  onDateChanged(): void {
    this.datePreset.set('custom');
  }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages() || page === this.pageNumber()) return;
    this.pageNumber.set(page);
    this.load();
  }

  changePageSize(size: string): void {
    this.pageSize.set(Number(size));
    this.pageNumber.set(1);
    this.load();
  }

  changeSort(): void {
    this.pageNumber.set(1);
    this.load();
  }

  transactionSource(transaction: BankTransactionItem): string {
    if (transaction.policyPaymentId) return `Policy payment · ${this.shortId(transaction.policyPaymentId)}`;
    if (transaction.vendorId) return `Vendor · ${this.shortId(transaction.vendorId)}`;
    if (transaction.salaryId) return `Salary · ${this.shortId(transaction.salaryId)}`;
    if (transaction.userId) return `User · ${this.shortId(transaction.userId)}`;
    return 'Manual / system';
  }

  private buildFilter(accountId: string): BankTransactionFilterParams {
    return {
      bankAccountId: accountId,
      search: this.search().trim() || undefined,
      transactionType: (this.transactionType() || undefined) as 'Credit' | 'Debit' | undefined,
      category: this.category().trim() || undefined,
      fromDate: this.fromDate() || undefined,
      toDate: this.toDate() || undefined,
      sortBy: this.sortBy(),
      sortOrder: this.sortOrder(),
      pageNumber: this.pageNumber(),
      pageSize: this.pageSize(),
      userId: this.userId().trim() || undefined,
      vendorId: this.vendorId().trim() || undefined,
      policyPaymentId: this.policyPaymentId().trim() || undefined,
    };
  }

  private indiaToday(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date());
    const part = (type: string) => parts.find((item) => item.type === type)?.value ?? '';
    return `${part('year')}-${part('month')}-${part('day')}`;
  }

  private formatUtcAsIndiaDate(date: Date): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(date);
  }

  private shortId(id: string): string {
    return id.slice(0, 8).toUpperCase();
  }
}
