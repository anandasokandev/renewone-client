import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  HostListener,
  inject,
  OnDestroy,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountService } from '../../../services/account/account.service';
import { Router } from '@angular/router';
import { AgentListItem, AgentSummary, RegisterAgentPayload } from '../../../models/account.model';

@Component({
  selector: 'app-admin-agents',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './admin-agents.html',
  styleUrl: './admin-agents.css',
})
export class AdminAgents implements OnInit, AfterViewInit, OnDestroy {
  private readonly accountService = inject(AccountService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);

  @ViewChild('scrollSentinel') scrollSentinel?: ElementRef<HTMLDivElement>;
  private observer?: IntersectionObserver;

  openAgent(agent: AgentListItem): void {
    void this.router.navigate(['/admin/agents', agent.accountId]);
  }

  // Agents & Summary State
  readonly agents = signal<AgentListItem[]>([]);
  readonly summary = signal<AgentSummary>({ activeAgents: 0, pendingApprovals: 0 });
  readonly isLoading = signal<boolean>(false);
  readonly searchQuery = signal<string>('');
  readonly statusFilter = signal<string>('All');
  readonly pageNumber = signal<number>(1);
  readonly pageSize = signal<number>(5);
  readonly totalRecords = signal<number>(0);
  readonly totalPages = signal<number>(1);
  readonly togglingAccountId = signal<string | null>(null);
  readonly approvingAccountId = signal<string | null>(null);

  readonly hasMoreAgents = computed(() => this.pageNumber() < this.totalPages());

  // Add Agent Modal & Form State
  readonly isAddModalOpen = signal<boolean>(false);
  readonly isSubmitting = signal<boolean>(false);
  readonly addError = signal<string | null>(null);
  readonly showPassword = signal<boolean>(false);

  readonly addAgentForm = this.fb.group({
    agentName: ['', [Validators.required, Validators.minLength(2)]],
    userName: ['', [Validators.required, Validators.minLength(3)]],
    contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    address: [''],
    pincode: ['', [Validators.pattern(/^$|^[0-9]{6}$/)]],
  });

  // Toast feedback & Clipboard state
  readonly toastMessage = signal<string | null>(null);
  readonly toastType = signal<'success' | 'info' | 'error'>('success');
  readonly copiedField = signal<string | null>(null);

  // Client-side quick filter over retrieved page items
  readonly filteredAgents = computed<AgentListItem[]>(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const status = this.statusFilter();
    let items = this.agents();

    if (status !== 'All') {
      items = items.filter((a) => a.status?.toLowerCase() === status.toLowerCase());
    }

    if (!query) return items;

    return items.filter(
      (a) =>
        a.agentId?.toLowerCase().includes(query) ||
        a.agentName?.toLowerCase().includes(query) ||
        a.agencyName?.toLowerCase().includes(query) ||
        a.email?.toLowerCase().includes(query) ||
        a.phoneNumber?.toLowerCase().includes(query)
    );
  });

  ngOnInit(): void {
    this.loadAgents();
  }

  ngAfterViewInit(): void {
    this.setupIntersectionObserver();
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    if (!this.hasMoreAgents() || this.isLoading()) return;
    const scrollPos = window.innerHeight + window.scrollY;
    const bodyHeight = document.documentElement.scrollHeight;
    if (bodyHeight - scrollPos < 200) {
      this.loadMoreAgents();
    }
  }

  private setupIntersectionObserver(): void {
    if (typeof IntersectionObserver === 'undefined') return;
    this.observer?.disconnect();
    this.observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          this.loadMoreAgents();
        }
      },
      { root: null, rootMargin: '100px', threshold: 0.1 }
    );
    if (this.scrollSentinel?.nativeElement) {
      this.observer.observe(this.scrollSentinel.nativeElement);
    }
  }

  loadMoreAgents(): void {
    if (!this.hasMoreAgents() || this.isLoading()) return;
    this.pageNumber.update((p) => p + 1);
    this.loadAgents(true);
    setTimeout(() => {
      if (this.scrollSentinel?.nativeElement && this.observer) {
        this.observer.observe(this.scrollSentinel.nativeElement);
      }
    }, 50);
  }

  loadAgents(isAppend = false): void {
    this.isLoading.set(true);
    this.accountService
      .getAgents({
        sortBy: 'Name',
        sortOrder: 'Asc',
        pageNumber: this.pageNumber(),
        pageSize: this.pageSize(),
        userType: 'Agent',
        search: this.searchQuery().trim() || undefined,
        status: this.statusFilter() !== 'All' ? this.statusFilter() : undefined,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            if (res.data.summary) {
              this.summary.set(res.data.summary);
            }
            if (res.data.agents) {
              const items = res.data.agents.items || [];
              if (isAppend) {
                this.agents.update((current) => [...current, ...items]);
              } else {
                this.agents.set(items);
              }
              this.totalRecords.set(res.data.agents.totalRecords ?? this.agents().length);
              this.totalPages.set(res.data.agents.totalPages ?? 1);
              this.pageNumber.set(res.data.agents.pageNumber ?? 1);
            }
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to fetch agents.', 'error');
        },
      });
  }

  refreshAgents(): void {
    this.pageNumber.set(1);
    this.loadAgents(false);
    this.showToast('Agents refreshed.', 'info');
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  submitSearch(): void {
    this.pageNumber.set(1);
    this.loadAgents(false);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
    this.loadAgents(false);
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
    this.pageNumber.set(1);
    this.loadAgents(false);
  }

  onToggleStatus(agent: AgentListItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.togglingAccountId() === agent.accountId) return;

    this.togglingAccountId.set(agent.accountId);
    const originalStatus = agent.status;
    const isCurrentlyActive = originalStatus?.toLowerCase() === 'active';
    const newStatus = isCurrentlyActive ? 'Inactive' : 'Active';

    // Optimistic update
    this.agents.update((items) =>
      items.map((a) => (a.accountId === agent.accountId ? { ...a, status: newStatus } : a))
    );

    // Update active agents summary count optimistically
    this.summary.update((s) => ({
      ...s,
      activeAgents: Math.max(0, s.activeAgents + (isCurrentlyActive ? -1 : 1)),
    }));

    this.accountService
      .toggleAgentStatus(agent.accountId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.togglingAccountId.set(null))
      )
      .subscribe({
        next: () => {
          this.showToast(
            `Agent "${agent.agentName}" is now ${newStatus}.`,
            'success'
          );
        },
        error: () => {
          // Revert optimistic update
          this.agents.update((items) =>
            items.map((a) => (a.accountId === agent.accountId ? { ...a, status: originalStatus } : a))
          );
          this.summary.update((s) => ({
            ...s,
            activeAgents: Math.max(0, s.activeAgents + (isCurrentlyActive ? 1 : -1)),
          }));
          this.showToast('Failed to update agent status.', 'error');
        },
      });
  }

  onEditAgent(agent: AgentListItem, event?: Event): void {
    if (event) event.stopPropagation();
    this.showToast(`Edit Agent "${agent.agentName}" will be configured next.`, 'info');
  }

  onApproveAgent(agent: AgentListItem, event?: Event): void {
    if (event) event.stopPropagation();
    if (this.approvingAccountId() === agent.accountId) return;

    this.approvingAccountId.set(agent.accountId);

    this.accountService
      .approveAgent(agent.accountId)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.approvingAccountId.set(null))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.showToast(res.message || 'Agent approved successfully', 'success');

            // Optimistically update agent in table
            this.agents.update((items) =>
              items.map((a) =>
                a.accountId === agent.accountId
                  ? { ...a, status: 'Active', isApproved: true }
                  : a
              )
            );

            // Update summary metrics
            this.summary.update((s) => ({
              ...s,
              pendingApprovals: Math.max(0, s.pendingApprovals - 1),
              activeAgents: s.activeAgents + 1,
            }));

            // Sync with backend
            this.loadAgents(false);
          } else {
            this.showToast(res.message || 'Failed to approve agent.', 'error');
          }
        },
        error: (err) => {
          this.showToast(err?.error?.message || 'Failed to approve agent.', 'error');
        },
      });
  }

  openAddAgentModal(): void {
    this.addError.set(null);
    this.showPassword.set(false);
    this.addAgentForm.reset({
      agentName: '',
      userName: '',
      contactNumber: '',
      email: '',
      password: '',
      address: '',
      pincode: '',
    });
    this.isAddModalOpen.set(true);
  }

  closeAddAgentModal(force = false): void {
    if (this.isSubmitting() && !force) return;
    this.isAddModalOpen.set(false);
    this.addError.set(null);
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((s) => !s);
  }

  submitAddAgent(): void {
    if (this.addAgentForm.invalid) {
      this.addAgentForm.markAllAsTouched();
      return;
    }

    const val = this.addAgentForm.getRawValue();
    this.isSubmitting.set(true);
    this.addError.set(null);

    const payload: RegisterAgentPayload = {
      agentName: (val.agentName || '').trim(),
      userName: (val.userName || '').trim(),
      contactNumber: (val.contactNumber || '').trim(),
      email: (val.email || '').trim().toLowerCase(),
      password: val.password || '',
      address: val.address?.trim() || undefined,
      pincode: val.pincode?.trim() || undefined,
    };

    this.accountService
      .registerAgent(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isSubmitting.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess) {
            this.showToast(res.message || `Agent "${payload.agentName}" registered successfully.`, 'success');
            this.closeAddAgentModal(true);
            this.loadAgents(false);
          } else {
            this.addError.set(res.message || 'Failed to register agent. Please check the details.');
          }
        },
        error: (err) => {
          const msg =
            err?.error?.message ||
            (typeof err?.error === 'string' ? err.error : null) ||
            'Failed to register agent. Please try again.';
          this.addError.set(msg);
        },
      });
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages() || newPage === this.pageNumber()) return;
    this.pageNumber.set(newPage);
    this.loadAgents(false);
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(Number(newSize));
    this.pageNumber.set(1);
    this.loadAgents(false);
  }

  copyToClipboard(text: string, label: string): void {
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

  formatDate(dateString?: string): string {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateString;
    }
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
