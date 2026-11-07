import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountService } from '../../../services/account/account.service';
import { Router } from '@angular/router';
import { AgentListItem, AgentSummary } from '../../../models/account.model';

@Component({
  selector: 'app-admin-agents',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-agents.html',
  styleUrl: './admin-agents.css',
})
export class AdminAgents implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly router = inject(Router);

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

  loadAgents(): void {
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
              this.agents.set(res.data.agents.items || []);
              this.totalRecords.set(res.data.agents.totalRecords ?? 0);
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
    this.loadAgents();
    this.showToast('Agents refreshed.', 'info');
  }

  onSearchChange(query: string): void {
    this.searchQuery.set(query);
  }

  clearSearch(): void {
    this.searchQuery.set('');
    this.pageNumber.set(1);
    this.loadAgents();
  }

  onStatusFilterChange(status: string): void {
    this.statusFilter.set(status);
    this.pageNumber.set(1);
    this.loadAgents();
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
            this.loadAgents();
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
    this.showToast('Add Agent popup will be configured next.', 'info');
  }

  onPageChange(newPage: number): void {
    if (newPage < 1 || newPage > this.totalPages() || newPage === this.pageNumber()) return;
    this.pageNumber.set(newPage);
    this.loadAgents();
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize.set(Number(newSize));
    this.pageNumber.set(1);
    this.loadAgents();
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
