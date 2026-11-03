import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, finalize, switchMap, map, of, catchError } from 'rxjs';
import { AccountService, AgentLookupItem } from '../../../services/account/account.service';
import { EnquiryService } from '../../../services/enquiry/enquiry.service';
import { CreateVehicleEnquiryPayload, InsuranceTypeItem, VehicleTypeItem } from '../../../models/enquiry.model';

interface CreatedEnquiryDetails {
  enquiryId?: string;
  enquiryNumber?: string;
  [key: string]: unknown;
}

@Component({
  selector: 'app-admin-enquiry-creation',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './admin-enquiry-creation.html',
  styleUrl: './admin-enquiry-creation.css',
})
export class AdminEnquiryCreation implements OnInit {
  private readonly accountService = inject(AccountService);
  private readonly enquiryService = inject(EnquiryService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly agentSearch$ = new Subject<string>();

  readonly step = signal<'details' | 'documents'>('details');
  readonly agentSearch = signal('');
  readonly agents = signal<AgentLookupItem[]>([]);
  readonly selectedAgent = signal<AgentLookupItem | null>(null);
  readonly isAgentLoading = signal(false);
  readonly agentError = signal<string | null>(null);
  readonly insuranceSearch = signal('');
  readonly insuranceTypes = signal<InsuranceTypeItem[]>([]);
  readonly selectedInsuranceTypeId = signal('');
  readonly isInsuranceLoading = signal(false);
  readonly insuranceError = signal<string | null>(null);
  readonly vehicleSearch = signal('');
  readonly vehicleTypes = signal<VehicleTypeItem[]>([]);
  readonly selectedVehicleTypeId = signal('');
  readonly isVehicleLoading = signal(false);
  readonly vehicleError = signal<string | null>(null);
  readonly customerName = signal('');
  readonly customerNumber = signal('');
  readonly vehicleNumber = signal('');
  readonly policyType = signal<'Comprehensive' | 'Third Party' | 'Own Damage'>('Comprehensive');
  readonly isRCOwnerChanged = signal(false);
  readonly hasPreviousClaim = signal(false);
  readonly ncbPercentage = signal<number | null>(20);
  readonly attemptedSubmit = signal(false);
  readonly isSubmitting = signal(false);
  readonly formError = signal<string | null>(null);
  readonly createdEnquiry = signal<CreatedEnquiryDetails | null>(null);
  readonly activeNcbOptions = [0, 20, 25, 35, 45, 50];

  readonly selectedInsuranceType = computed(() =>
    this.insuranceTypes().find(type => type.id === this.selectedInsuranceTypeId()) ?? null
  );
  readonly isVehicleInsurance = computed(() =>
    this.selectedInsuranceType()?.name.trim().toLowerCase() === 'vehicle insurance'
  );
  readonly isThirdPartyPolicy = computed(() => this.policyType() === 'Third Party');
  readonly visibleAgents = computed(() => this.agents());
  readonly visibleInsuranceTypes = computed(() => {
    const query = this.insuranceSearch().trim().toLowerCase();
    return this.insuranceTypes().filter(type => type.name.toLowerCase().includes(query));
  });
  readonly visibleVehicleTypes = computed(() => {
    const query = this.vehicleSearch().trim().toLowerCase();
    return this.vehicleTypes().filter(type => type.typeName.toLowerCase().includes(query));
  });

  constructor() {
    this.agentSearch$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(search => {
        this.isAgentLoading.set(true);
        this.agentError.set(null);
        return this.accountService.getAgentLookup(search).pipe(
          map(response => ({ response, error: null as string | null })),
          catchError(error => of({ response: null, error: error?.error?.message || 'Unable to load agents.' })),
          finalize(() => this.isAgentLoading.set(false))
        );
      }),
      takeUntilDestroyed(this.destroyRef)
    ).subscribe(({ response, error }) => {
      if (error) {
        this.agentError.set(error);
        this.agents.set([]);
      } else if (response?.isSuccess && response.data?.items) {
        this.agents.set(response.data.items.filter(agent => agent.isActive !== false && agent.status?.toLowerCase() !== 'inactive'));
      } else {
        this.agents.set([]);
        this.agentError.set(response?.message || 'Unable to load agents.');
      }
    });
  }

  ngOnInit(): void {
    this.loadAgents('');
    this.loadInsuranceTypes();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      if (params.get('step') === 'documents') {
        this.step.set('documents');
        try {
          const cached = sessionStorage.getItem('admin-created-enquiry');
          if (cached) this.createdEnquiry.set(JSON.parse(cached));
        } catch {
          this.createdEnquiry.set(null);
        }
      }
    });
  }

  loadAgents(search: string): void {
    this.agentSearch.set(search);
    this.agentSearch$.next(search);
  }

  chooseAgent(agent: AgentLookupItem): void {
    this.selectedAgent.set(agent);
    this.agentSearch.set(agent.agentName);
    this.agents.set([]);
    this.agentError.set(null);
  }

  clearAgent(): void {
    this.selectedAgent.set(null);
    this.agentSearch.set('');
    this.loadAgents('');
  }

  loadInsuranceTypes(): void {
    this.isInsuranceLoading.set(true);
    this.enquiryService.getInsuranceTypes().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isInsuranceLoading.set(false))
    ).subscribe({
      next: response => {
        if (response.isSuccess && response.data) this.insuranceTypes.set(response.data.filter(type => type.isActive));
        else this.insuranceError.set(response.message || 'Unable to load insurance types.');
      },
      error: error => this.insuranceError.set(error?.error?.message || 'Unable to load insurance types.'),
    });
  }

  selectInsuranceType(typeId: string): void {
    this.selectedInsuranceTypeId.set(typeId);
    this.selectedVehicleTypeId.set('');
    this.vehicleSearch.set('');
    this.vehicleTypes.set([]);
    this.vehicleError.set(null);
    this.formError.set(null);
    if (this.isVehicleInsurance()) this.loadVehicleTypes();
  }

  loadVehicleTypes(): void {
    this.isVehicleLoading.set(true);
    this.enquiryService.getVehicleTypes().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isVehicleLoading.set(false))
    ).subscribe({
      next: response => {
        if (response.isSuccess && response.data) this.vehicleTypes.set(response.data.filter(type => type.isActive));
        else this.vehicleError.set(response.message || 'Unable to load vehicle types.');
      },
      error: error => this.vehicleError.set(error?.error?.message || 'Unable to load vehicle types.'),
    });
  }

  selectPreviousClaim(hasClaim: boolean): void {
    this.hasPreviousClaim.set(hasClaim);
    this.ncbPercentage.set(hasClaim ? null : 20);
  }

  selectPolicyType(policy: 'Comprehensive' | 'Third Party' | 'Own Damage'): void {
    this.policyType.set(policy);
    if (policy === 'Third Party') {
      this.hasPreviousClaim.set(false);
      this.ncbPercentage.set(null);
    } else if (this.ncbPercentage() === null) {
      this.ncbPercentage.set(20);
    }
  }

  setCustomerNumber(value: string): void {
    this.customerNumber.set(value.replace(/\D/g, '').slice(0, 10));
  }

  setVehicleNumber(value: string): void {
    this.vehicleNumber.set(value.toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 15));
  }

  get selectedVehicleType(): VehicleTypeItem | null {
    return this.vehicleTypes().find(type => type.id === this.selectedVehicleTypeId()) ?? null;
  }

  get canShowDetails(): boolean {
    return this.isVehicleInsurance() && !!this.selectedVehicleTypeId();
  }

  get hasValidPhone(): boolean {
    return /^[0-9]{10}$/.test(this.customerNumber());
  }

  get hasValidVehicleNumber(): boolean {
    return /^[A-Z0-9 -]{4,15}$/.test(this.vehicleNumber());
  }

  get isValid(): boolean {
    return !!this.selectedAgent()?.accountId && !!this.selectedInsuranceTypeId() && !!this.selectedVehicleTypeId() &&
      this.customerName().trim().length >= 2 && /^[0-9]{10}$/.test(this.customerNumber()) &&
      /^[A-Z0-9 -]{4,15}$/.test(this.vehicleNumber());
  }

  proceed(): void {
    this.attemptedSubmit.set(true);
    this.formError.set(null);
    if (!this.isValid || this.isSubmitting()) return;
    const accountId = this.selectedAgent()!.accountId;
    const payload: CreateVehicleEnquiryPayload = {
      accountId,
      AccountId: accountId,
      insuranceTypeId: this.selectedInsuranceTypeId(),
      vehicleTypeId: this.selectedVehicleTypeId(),
      customerName: this.customerName().trim(),
      customerNumber: this.customerNumber(),
      vehicleNumber: this.vehicleNumber(),
      miPolicyType: this.policyType(),
      isRCOwnerChanged: this.isRCOwnerChanged(),
      hasPreviousClaim: this.hasPreviousClaim(),
      ncbPercentage: this.isThirdPartyPolicy() ? 0 : (this.hasPreviousClaim() ? null : this.ncbPercentage()),
      priority: 1,
      submissionMode: 1,
    };
    this.isSubmitting.set(true);
    this.enquiryService.createVehicleEnquiry(payload).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.isSubmitting.set(false))
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) {
          this.formError.set(response.message || 'Unable to create the enquiry.');
          return;
        }
        const result = response.data as CreatedEnquiryDetails;
        this.createdEnquiry.set(result);
        sessionStorage.setItem('admin-created-enquiry', JSON.stringify(result));
        this.step.set('documents');
        this.router.navigate([], { relativeTo: this.route, queryParams: { step: 'documents', enquiryId: result.enquiryId }, queryParamsHandling: 'merge' });
      },
      error: error => this.formError.set(error?.error?.message || 'Unable to create the enquiry.'),
    });
  }

  backToQueue(): void {
    this.router.navigate(['/admin/enquiries']);
  }
}
