import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { BankAccountService } from '../../../../services/bank-account/bank-account.service';
import { BankAccountItem, UpdateBankAccountRequest } from '../../../../models/bank-account.model';

@Component({
  selector: 'app-bank-account-management',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
  templateUrl: './bank-account-management.html',
  styleUrl: './bank-account-management.css',
})
export class BankAccountManagement implements OnInit {
  private readonly bankAccountService = inject(BankAccountService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  // Bank Accounts State
  readonly accounts = signal<BankAccountItem[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(10);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly togglingAccountId = signal<string | null>(null);
  readonly editingAccountId = signal<string | null>(null);

  // Add Bank Account Modal State
  readonly isAddModalOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly addError = signal<string | null>(null);

  readonly addAccountForm = this.fb.nonNullable.group({
    accountName: ['', [Validators.required]],
    bankName: ['', [Validators.required]],
    branchName: ['', [Validators.required]],
    accountNumber: ['', [Validators.required]],
    ifscCode: ['', [Validators.required]],
    upiId: [''],
    accountHolderName: ['', [Validators.required]],
    isPrimary: [false],
    isActive: [true],
  });

  // Toast feedback & Clipboard state
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'info' | 'error'>('success');
  readonly copiedField = signal<string | null>(null);

  // Client-side instant filter over retrieved items
  readonly filteredAccounts = computed<BankAccountItem[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const items = this.accounts();
    if (!query) return items;
    return items.filter(
      (item) =>
        item.accountName?.toLowerCase().includes(query) ||
        item.accountHolderName?.toLowerCase().includes(query) ||
        item.bankName?.toLowerCase().includes(query) ||
        item.branchName?.toLowerCase().includes(query) ||
        item.accountNumber?.toLowerCase().includes(query) ||
        item.ifscCode?.toLowerCase().includes(query) ||
        item.upiId?.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadBankAccounts();
  }

  loadBankAccounts(): void {
    this.isLoading.set(true);
    this.bankAccountService
      .getBankAccounts({
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        search: this.searchQuery().trim() || undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.accounts.set(res.data.items || []);
            this.totalRecords.set(res.data.totalRecords ?? 0);
            this.totalPages.set(res.data.totalPages ?? 1);
            this.pageNumber.set(res.data.pageNumber ?? 1);
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to load bank accounts.', 'error');
        },
      });
  }

  refreshBankAccounts(): void {
    this.loadBankAccounts();
    this.showToast('Bank accounts refreshed.', 'info');
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
    this.loadBankAccounts();
  }

  onToggleStatus(account: BankAccountItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.togglingAccountId() === account.id) return;

    this.togglingAccountId.set(account.id);
    const originalStatus = account.isActive;
    const newStatus = !originalStatus;

    // Optimistic update
    this.accounts.update((items) =>
      items.map((acc) => (acc.id === account.id ? { ...acc, isActive: newStatus } : acc))
    );

    this.bankAccountService
      .toggleBankAccountStatus(account.id)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.togglingAccountId.set(null))
      )
      .subscribe({
        next: (response) => {
          if (!response.isSuccess) {
            this.accounts.update((items) => items.map((acc) => acc.id === account.id ? { ...acc, isActive: originalStatus } : acc));
            this.showToast(response.message || 'Failed to update bank account status.', 'error');
            return;
          }
          this.showToast(
            `Account "${account.accountName}" is now ${newStatus ? 'Active' : 'Inactive'}.`,
            'success'
          );
        },
        error: () => {
          // Revert on failure
          this.accounts.update((items) =>
            items.map((acc) => (acc.id === account.id ? { ...acc, isActive: originalStatus } : acc))
          );
          this.showToast('Failed to update bank account status.', 'error');
        },
      });
  }

  onEditAccount(account: BankAccountItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.openEditAccountModal(account);
  }

  openAccountDetails(account: BankAccountItem): void {
    void this.router.navigate(['/admin/accelerators/bank-account-details', account.id]);
  }

  openEditAccountModal(account: BankAccountItem): void {
    this.addError.set(null);
    this.editingAccountId.set(account.id);
    this.addAccountForm.reset({
      accountName: account.accountName,
      bankName: account.bankName,
      branchName: account.branchName,
      accountNumber: account.accountNumber,
      ifscCode: account.ifscCode,
      upiId: account.upiId || '',
      accountHolderName: account.accountHolderName,
      isPrimary: account.isPrimary,
      isActive: account.isActive,
    });
    this.isAddModalOpen.set(true);
  }

  openAddAccountModal(): void {
    this.addError.set(null);
    this.editingAccountId.set(null);
    this.addAccountForm.reset({
      accountName: '',
      bankName: '',
      branchName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      accountHolderName: '',
      isPrimary: false,
      isActive: true,
    });
    this.isAddModalOpen.set(true);
  }

  closeAddAccountModal(force: boolean = false): void {
    if (this.isSubmitting() && !force) return;
    this.isAddModalOpen.set(false);
    this.addError.set(null);
    this.editingAccountId.set(null);
    this.addAccountForm.reset({
      accountName: '',
      bankName: '',
      branchName: '',
      accountNumber: '',
      ifscCode: '',
      upiId: '',
      accountHolderName: '',
      isPrimary: false,
      isActive: true,
    });
  }

  submitAddAccount(): void {
    if (this.addAccountForm.invalid) {
      this.addAccountForm.markAllAsTouched();
      return;
    }

    const val = this.addAccountForm.getRawValue();
    this.isSubmitting.set(true);
    this.addError.set(null);

    const payload: UpdateBankAccountRequest = {
      accountName: val.accountName.trim(),
      bankName: val.bankName.trim(),
      branchName: val.branchName.trim(),
      accountNumber: val.accountNumber.trim(),
      ifscCode: val.ifscCode.trim().toUpperCase(),
      upiId: val.upiId.trim(),
      accountHolderName: val.accountHolderName.trim(),
      isPrimary: val.isPrimary,
      isActive: val.isActive,
    };

    const accountId = this.editingAccountId();
    const request = accountId
      ? this.bankAccountService.updateBankAccount(accountId, payload)
      : this.bankAccountService.createBankAccount(payload);

    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.isSubmitting.set(false);
            this.closeAddAccountModal(true);
            this.showToast(res.message || (accountId ? 'Bank account updated successfully.' : 'Bank account created successfully.'), 'success');
            this.loadBankAccounts();
          } else {
            this.addError.set(res.message || (accountId ? 'Failed to update bank account.' : 'Failed to create bank account.'));
          }
        },
        error: (err) => {
          this.addError.set(
            err?.error?.message || (accountId ? 'An error occurred while updating the bank account.' : 'An error occurred while creating the bank account.')
          );
        },
      });
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages() || newPage === this.pageNumber()) return;
    this.pageNumber.set(newPage);
    this.loadBankAccounts();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(Number(newSize));
    this.pageNumber.set(1);
    this.loadBankAccounts();
  }

  copyToClipboard(text: string, label: string, event?: Event): void {
    event?.stopPropagation();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      this.copiedField.set(text);
      this.showToast(`Copied ${label} to clipboard.`, 'success');
      setTimeout(() => {
        if (this.copiedField() === text) {
          this.copiedField.set(null);
        }
      }, 2000);
    });
  }

  showToast(message: string, type: 'success' | 'info' | 'error' = 'success'): void {
    this.toastMessage.set(message);
    this.toastType.set(type);
    setTimeout(() => {
      if (this.toastMessage() === message) {
        this.toastMessage.set(null);
      }
    }, 3500);
  }

  clearToast(): void {
    this.toastMessage.set(null);
  }
}
