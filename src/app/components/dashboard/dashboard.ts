import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { EnquiryService } from '../../services/enquiry/enquiry.service';
import { EnquiryMetrics } from '../../models/enquiry.model';
import { InsuranceProducts } from '../insurance-products/insurance-products';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule, InsuranceProducts],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  private enquiryService = inject(EnquiryService);
  private authService = inject(Auth);

  readonly currentUser = this.authService.currentUser;

  // Quick metrics from enquiry service
  readonly metrics = signal<EnquiryMetrics | null>(null);
  readonly isMetricsLoading = signal<boolean>(false);

  ngOnInit(): void {
    this.loadQuickMetrics();
  }

  loadQuickMetrics(): void {
    this.isMetricsLoading.set(true);
    this.enquiryService.getAgentEnquiries({ pageSize: 1 }).subscribe({
      next: (res) => {
        this.isMetricsLoading.set(false);
        if (res && res.isSuccess && res.data && (res.data as any).metrics) {
          this.metrics.set((res.data as any).metrics);
        }
      },
      error: () => {
        this.isMetricsLoading.set(false);
      },
    });
  }
}
