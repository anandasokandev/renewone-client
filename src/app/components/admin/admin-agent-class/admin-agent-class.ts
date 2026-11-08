import { CommonModule } from '@angular/common';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { AdminAgentClass as AgentClass, AgentClassRequest } from '../../../models/admin-agent-class.model';
import { AdminAgentClassService } from '../../../services/admin-agent-class/admin-agent-class.service';

@Component({
  selector: 'app-admin-agent-class',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './admin-agent-class.html',
  styleUrl: './admin-agent-class.css',
})
export class AdminAgentClass implements OnInit {
  private readonly service = inject(AdminAgentClassService);
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);

  readonly classes = signal<AgentClass[]>([]);
  readonly selectedClass = signal<AgentClass | null>(null);
  readonly loading = signal(false);
  readonly quickViewLoading = signal(false);
  readonly saving = signal(false);
  readonly togglingId = signal<string | null>(null);
  readonly modalOpen = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly pageError = signal<string | null>(null);
  readonly modalError = signal<string | null>(null);
  readonly notice = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    className: ['', [Validators.required, Validators.maxLength(100)]],
    commSharePercentage: [0, [Validators.required, Validators.min(0), Validators.max(100)]],
  });

  ngOnInit(): void { this.loadClasses(); }

  loadClasses(): void {
    this.loading.set(true);
    this.pageError.set(null);
    this.service.getAll().pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.loading.set(false)),
    ).subscribe({
      next: response => {
        if (!response.isSuccess) { this.pageError.set(response.message || 'Could not load agent classes.'); return; }
        this.classes.set(response.data ?? []);
      },
      error: error => {
        if (error?.status === 404) this.classes.set([]);
        else this.pageError.set(this.errorMessage(error, 'Could not load agent classes.'));
      },
    });
  }

  openCreate(): void {
    this.editingId.set(null);
    this.modalError.set(null);
    this.form.reset({ className: '', commSharePercentage: 0 });
    this.modalOpen.set(true);
  }

  openEdit(item: AgentClass, event?: Event): void {
    event?.stopPropagation();
    this.editingId.set(item.id);
    this.modalError.set(null);
    this.form.reset({ className: item.className, commSharePercentage: item.commSharePercentage });
    this.modalOpen.set(true);
  }

  closeModal(): void {
    if (!this.saving()) this.modalOpen.set(false);
  }

  save(): void {
    if (this.form.invalid || this.saving()) { this.form.markAllAsTouched(); return; }
    const request: AgentClassRequest = {
      className: this.form.controls.className.value.trim(),
      commSharePercentage: Number(this.form.controls.commSharePercentage.value),
    };
    const id = this.editingId();
    this.saving.set(true);
    this.modalError.set(null);
    const action = id ? this.service.update(id, request) : this.service.create(request);
    action.pipe(takeUntilDestroyed(this.destroyRef), finalize(() => this.saving.set(false))).subscribe({
      next: response => {
        if (!response.isSuccess) { this.modalError.set(response.message || 'Could not save this agent class.'); return; }
        this.modalOpen.set(false);
        this.notice.set(response.message || (id ? 'Agent class updated.' : 'Agent class created.'));
        this.loadClasses();
        if (id && this.selectedClass()?.id === id) this.openQuickView(id);
      },
      error: error => this.modalError.set(this.errorMessage(error, 'Could not save this agent class.')),
    });
  }

  toggleStatus(item: AgentClass, event: Event): void {
    event.stopPropagation();
    if (this.togglingId()) return;
    this.togglingId.set(item.id);
    this.pageError.set(null);
    this.service.toggleStatus(item.id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.togglingId.set(null)),
    ).subscribe({
      next: response => {
        if (!response.isSuccess) { this.pageError.set(response.message || 'Could not change class status.'); return; }
        this.notice.set(response.message || 'Agent class status updated.');
        this.loadClasses();
        if (this.selectedClass()?.id === item.id) this.openQuickView(item.id);
      },
      error: error => this.pageError.set(this.errorMessage(error, 'Could not change class status.')),
    });
  }

  openQuickView(id: string): void {
    this.quickViewLoading.set(true);
    this.pageError.set(null);
    this.service.getById(id).pipe(
      takeUntilDestroyed(this.destroyRef),
      finalize(() => this.quickViewLoading.set(false)),
    ).subscribe({
      next: response => {
        if (!response.isSuccess || !response.data) { this.pageError.set(response.message || 'Could not load agents for this class.'); return; }
        this.selectedClass.set(response.data);
      },
      error: error => this.pageError.set(this.errorMessage(error, 'Could not load agents for this class.')),
    });
  }

  closeQuickView(): void { this.selectedClass.set(null); }

  private errorMessage(error: any, fallback: string): string {
    return error?.error?.message || (typeof error?.error === 'string' ? error.error : fallback);
  }
}
