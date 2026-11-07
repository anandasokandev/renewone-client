import { CommonModule, CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AccountService } from '../../../services/account/account.service';
import { AgentAdminDetails, AgentDashboardOverview, AgentStaffPerformanceData, AgentFinanceData, AgentActivityData, AgentProfitabilityData, AgentProfitPeriodSnapshot, GeneratedPasswordResetData, UpdateAgentAdminDetailsRequest } from '../../../models/account.model';
import { Auth } from '../../../services/auth/auth';

@Component({
  selector: 'app-admin-view-agents',
  imports: [CommonModule, CurrencyPipe, DatePipe, DecimalPipe, RouterLink, FormsModule],
  templateUrl: './admin-view-agents.html',
  styleUrl: './admin-view-agents.css',
})
export class AdminViewAgents implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly accounts = inject(AccountService);
  private readonly auth = inject(Auth);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly tab = signal<'overview' | 'staff' | 'finance' | 'activity'>('overview');
  readonly agent = signal<AgentAdminDetails | null>(null);
  readonly overview = signal<AgentDashboardOverview | null>(null);
  readonly staffData = signal<AgentStaffPerformanceData | null>(null);
  readonly finance = signal<AgentFinanceData | null>(null);
  readonly activity = signal<AgentActivityData | null>(null);
  readonly profitability = signal<AgentProfitabilityData | null>(null);
  readonly profitabilityLoading = signal(false);
  readonly profitabilityError = signal('');
  readonly canViewProfitability = computed(() => ['superadmin', 'supervisor'].includes(this.auth.currentUser()?.userType?.trim().toLowerCase() ?? ''));
  readonly canManageAgent = computed(() => this.auth.isAdmin());
  readonly editingDetails = signal(false);
  readonly savingDetails = signal(false);
  readonly editDetailsError = signal('');
  readonly credentialActionError = signal('');
  readonly credentialBusy = signal<string | null>(null);
  readonly generatedPassword = signal<GeneratedPasswordResetData | null>(null);
  editDetails: UpdateAgentAdminDetailsRequest = { agentName: '', email: '', phoneNumber: '', address: '', pincode: '' };
  readonly profitPeriod = signal<'today' | 'week' | 'year'>('today');
  readonly selectedProfitSnapshot = computed<AgentProfitPeriodSnapshot | null>(() => {
    const data = this.profitability();
    if (!data) return null;
    const period = this.profitPeriod();
    return period === 'today' ? data.today : period === 'week' ? data.thisWeek : data.thisYear;
  });
  readonly combinedProfit = computed(() => (this.selectedProfitSnapshot()?.adminProfit ?? 0) + (this.selectedProfitSnapshot()?.agentEarnings ?? 0));
  readonly adminProfitShare = computed(() => this.shareOf(this.selectedProfitSnapshot()?.adminProfit ?? 0));
  readonly agentProfitShare = computed(() => this.shareOf(this.selectedProfitSnapshot()?.agentEarnings ?? 0));
  readonly profitPieBackground = computed(() => {
    const total = this.combinedProfit();
    if (total <= 0) return 'conic-gradient(#e0e0e0 0 100%)';
    const adminStop = this.adminProfitShare();
    return `conic-gradient(#0f62fe 0 ${adminStop}%, #24a148 ${adminStop}% 100%)`;
  });
  readonly tabLoading = signal(false);
  readonly actionMessage = signal('');
  readonly walletType = signal<'Credit' | 'Debit'>('Credit');
  readonly manualWalletType = signal<'Credit' | 'Debit'>('Credit');
  walletAmount = 0;
  walletReason = '';
  manualWalletAmount = 0;
  manualWalletReason = '';
  private accountId = '';

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('accountId');
    if (!id) { this.error.set('Agent account was not specified.'); this.loading.set(false); return; }
    this.accountId = id;
    this.accounts.getAgentDetails(id).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.loading.set(false)))
      .subscribe({ next: r => r.isSuccess && r.data ? this.agent.set(r.data) : this.error.set(r.message || 'Unable to load agent.'), error: () => this.error.set('Unable to load agent details.') });
    this.accounts.getAgentDashboardOverview(id).pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ next: r => { if (r.isSuccess && r.data) this.overview.set(r.data); }, error: () => {} });
    if (this.canViewProfitability()) this.loadProfitability();
  }

  selectTab(tab: 'overview' | 'staff' | 'finance' | 'activity'): void {
    this.tab.set(tab);
    if (tab === 'staff' && !this.staffData()) this.loadStaff();
    if (tab === 'finance' && !this.finance()) this.loadFinance();
    if (tab === 'activity' && !this.activity()) this.loadActivity();
  }

  beginEditDetails(agent: AgentAdminDetails): void {
    this.editDetails = {
      agentName: agent.agentName || agent.agencyName || '',
      email: agent.email || '',
      phoneNumber: agent.phoneNumber || '',
      address: agent.address || '',
      pincode: agent.pincode || '',
    };
    this.editDetailsError.set('');
    this.editingDetails.set(true);
  }

  cancelEditDetails(): void { this.editingDetails.set(false); this.editDetailsError.set(''); }

  saveAgentDetails(): void {
    this.editDetailsError.set('');
    const payload: UpdateAgentAdminDetailsRequest = {
      agentName: this.editDetails.agentName.trim(),
      email: this.editDetails.email.trim(),
      phoneNumber: this.editDetails.phoneNumber.trim(),
      address: this.editDetails.address?.trim() || null,
      pincode: this.editDetails.pincode?.trim() || null,
    };
    if (payload.agentName.length < 2 || payload.agentName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(payload.email) || !/^[0-9]{10}$/.test(payload.phoneNumber) || (payload.pincode !== null && !/^[0-9]{6}$/.test(payload.pincode))) {
      this.editDetailsError.set('Check the required fields: name, valid email, 10-digit phone, and optional 6-digit pincode.');
      return;
    }
    this.savingDetails.set(true);
    this.accounts.updateAgentDetails(this.accountId, payload).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.savingDetails.set(false)))
      .subscribe({
        next: r => {
          if (r.isSuccess && r.data) { this.agent.set(r.data); this.editingDetails.set(false); this.actionMessage.set('Agent details updated.'); }
          else this.editDetailsError.set(r.message || 'Unable to update agent details.');
        },
        error: e => this.editDetailsError.set(e?.error?.message || e?.error?.errors?.join?.(' ') || 'Unable to update agent details.'),
      });
  }

  resetAgentPassword(): void {
    if (!confirm('Reset this agent’s password? The new generated password will be shown once.')) return;
    this.generatedPassword.set(null);
    this.credentialActionError.set('');
    this.credentialBusy.set('agent');
    this.accounts.resetAgentPassword(this.accountId).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.credentialBusy.set(null)))
      .subscribe({ next: r => r.isSuccess && r.data ? this.generatedPassword.set(r.data) : this.credentialActionError.set(r.message || 'Unable to reset agent password.'), error: e => this.credentialActionError.set(e?.error?.message || 'Unable to reset agent password.') });
  }

  resetStaffPassword(staffId: string, staffName: string): void {
    if (!confirm(`Reset the password for ${staffName}? The new generated password will be shown once.`)) return;
    this.generatedPassword.set(null);
    this.credentialActionError.set('');
    this.credentialBusy.set(staffId);
    this.accounts.resetStaffPassword(this.accountId, staffId).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.credentialBusy.set(null)))
      .subscribe({ next: r => r.isSuccess && r.data ? this.generatedPassword.set(r.data) : this.credentialActionError.set(r.message || 'Unable to reset staff password.'), error: e => this.credentialActionError.set(e?.error?.message || 'Unable to reset staff password.') });
  }

  closeGeneratedPassword(): void { this.generatedPassword.set(null); }
  copyGeneratedPassword(): void {
    const password = this.generatedPassword()?.generatedPassword;
    if (!password) return;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(password).then(() => this.actionMessage.set('Generated password copied.')).catch(() => this.actionMessage.set('Select and copy the generated password manually.'));
    } else this.actionMessage.set('Select and copy the generated password manually.');
  }

  setProfitPeriod(period: 'today' | 'week' | 'year'): void { this.profitPeriod.set(period); }
  profitChangeLabel(change: number | null): string {
    if (change === null) return 'No comparable baseline';
    const comparison = this.profitPeriod() === 'today' ? 'vs same time yesterday' : this.profitPeriod() === 'week' ? 'vs same point last week' : 'vs same date last year';
    return `${change > 0 ? '+' : ''}${change.toFixed(1)}% ${comparison}`;
  }
  private shareOf(value: number): number {
    const total = this.combinedProfit();
    return total > 0 ? Math.round(Math.max(0, value) / total * 1000) / 10 : 0;
  }
  private loadProfitability(): void {
    this.profitabilityLoading.set(true);
    this.accounts.getAgentProfitability(this.accountId).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.profitabilityLoading.set(false)))
      .subscribe({ next: r => r.isSuccess && r.data ? this.profitability.set(r.data) : this.profitabilityError.set(r.message || 'Profitability is unavailable.'), error: e => this.profitabilityError.set(e?.error?.message || 'Unable to load agent profitability.') });
  }

  private loadStaff(): void {
    this.tabLoading.set(true);
    this.accounts.getAgentStaffPerformance(this.accountId).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.tabLoading.set(false)))
      .subscribe({ next: r => r.isSuccess && r.data ? this.staffData.set(r.data) : this.actionMessage.set(r.message || 'Could not load staff.'), error: () => this.actionMessage.set('Could not load staff performance.') });
  }
  private loadFinance(): void {
    this.tabLoading.set(true);
    this.accounts.getAgentFinance(this.accountId).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.tabLoading.set(false)))
      .subscribe({ next: r => r.isSuccess && r.data ? this.finance.set(r.data) : this.actionMessage.set(r.message || 'Could not load finance.'), error: () => this.actionMessage.set('Could not load agent finance.') });
  }
  private loadActivity(): void {
    this.tabLoading.set(true);
    this.accounts.getAgentActivity(this.accountId).pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.tabLoading.set(false)))
      .subscribe({ next: r => r.isSuccess && r.data ? this.activity.set(r.data) : this.actionMessage.set(r.message || 'Could not load activity.'), error: () => this.actionMessage.set('Could not load agent activity.') });
  }
  submitWalletAdjustment(): void {
    const amount = Number(this.walletAmount);
    const remarks = this.walletReason.trim();
    if (!(amount > 0) || !remarks) { this.actionMessage.set('Enter a positive amount and reason.'); return; }
    if (!confirm(`${this.walletType()} wallet adjustment of ₹${amount.toFixed(2)}?`)) return;
    this.tabLoading.set(true);
    this.accounts.adjustAgentWallet({ accountId: this.accountId, transactionType: this.walletType(), amount, remarks })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.tabLoading.set(false)))
      .subscribe({ next: r => { this.actionMessage.set(r.message || 'Wallet adjusted.'); this.walletAmount = 0; this.walletReason = ''; this.loadFinance(); }, error: e => this.actionMessage.set(e?.error?.message || 'Wallet adjustment failed.') });
  }
  submitManualWalletAdjustment(): void {
    const amount = Number(this.manualWalletAmount);
    const remarks = this.manualWalletReason.trim();
    if (!(amount > 0) || !remarks) { this.actionMessage.set('Enter a positive amount and reason.'); return; }
    if (!confirm(`${this.manualWalletType()} manual wallet by ₹${amount.toFixed(2)}?`)) return;
    this.tabLoading.set(true);
    this.accounts.adjustAgentManualWallet({ accountId: this.accountId, transactionType: this.manualWalletType(), amount, remarks })
      .pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.tabLoading.set(false)))
      .subscribe({ next: r => { this.actionMessage.set(r.message || 'Manual Wallet adjusted.'); this.manualWalletAmount = 0; this.manualWalletReason = ''; this.loadFinance(); }, error: e => this.actionMessage.set(e?.error?.message || 'Manual Wallet adjustment failed.') });
  }
}
