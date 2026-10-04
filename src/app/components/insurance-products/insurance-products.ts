import { Component, computed, EventEmitter, inject, Input, OnChanges, OnInit, Output, SimpleChanges, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { DashboardService } from '../../services/dashboard/dashboard.service';
import { DashboardProduct } from '../../models/dashboard.model';

@Component({
  selector: 'app-insurance-products',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './insurance-products.html',
  styleUrl: './insurance-products.css',
})
export class InsuranceProducts implements OnInit, OnChanges {
  private dashboardService = inject(DashboardService);
  private router = inject(Router);

  @Input() title: string = 'Sell Insurance Policies';
  @Input() caption: string = 'Select a line of business to initiate an enquiry or instant quote';
  @Input() productsInput: DashboardProduct[] | null = null;
  @Input() autoFetch: boolean = true;
  @Input() collapseThreshold: number = 7;
  @Input() navigateOnClick: boolean = true;
  @Input() showCardBorder: boolean = true;

  @Output() productSelected = new EventEmitter<DashboardProduct>();

  readonly products = signal<DashboardProduct[]>([]);
  readonly isLoading = signal<boolean>(true);
  readonly errorMessage = signal<string | null>(null);
  readonly isCollapsed = signal<boolean>(false);

  readonly displayedProducts = computed(() => {
    const list = this.products();
    if (this.isCollapsed() && list.length > this.collapseThreshold) {
      return list.slice(0, this.collapseThreshold);
    }
    return list;
  });

  ngOnInit(): void {
    if (this.productsInput && this.productsInput.length > 0) {
      this.products.set(this.sortProducts(this.productsInput));
      this.isLoading.set(false);
    } else if (this.autoFetch) {
      this.loadProducts();
    } else {
      this.isLoading.set(false);
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['productsInput'] && this.productsInput) {
      this.products.set(this.sortProducts(this.productsInput));
      this.isLoading.set(false);
    }
  }

  loadProducts(): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.dashboardService.getDashboardProducts().subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res && res.isSuccess && Array.isArray(res.data)) {
          this.products.set(this.sortProducts(res.data));
        } else {
          this.products.set([]);
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        console.error('Failed to load dashboard products:', err);
        this.errorMessage.set(err?.error?.message || 'Failed to load insurance products.');
        this.products.set([]);
      },
    });
  }

  private sortProducts(list: DashboardProduct[]): DashboardProduct[] {
    return [...list].sort((a, b) => (a.displayOrder || 0) - (b.displayOrder || 0));
  }

  toggleViewToggle(): void {
    this.isCollapsed.update(prev => !prev);
  }

  onProductClick(product: DashboardProduct): void {
    this.productSelected.emit(product);

    if (this.navigateOnClick) {
      const typeParam = (product.insuranceTypeName || product.name || '').trim();
      const queryParams: Record<string, string> = {
        type: typeParam,
      };

      if (product.insuranceTypeId) {
        queryParams['insuranceTypeId'] = product.insuranceTypeId;
      }

      const isVehicleInsurance =
        typeParam.toLowerCase() === 'vehicle insurance' ||
        (product.insuranceTypeName || '').trim().toLowerCase() === 'vehicle insurance';

      if (isVehicleInsurance && product.vehicleTypeId) {
        queryParams['vehicleTypeId'] = product.vehicleTypeId;
      }

      this.router.navigate(['/enquiry/create-enquiry'], {
        queryParams,
      });
    }
  }

  getBadgeClass(color?: string): string {
    switch (color?.toLowerCase()) {
      case 'green':
      case 'success':
        return 'badge-green';
      case 'red':
      case 'danger':
        return 'badge-red';
      case 'blue':
      case 'primary':
        return 'badge-blue';
      case 'yellow':
      case 'amber':
      case 'warning':
        return 'badge-yellow';
      default:
        return 'badge-default';
    }
  }

  getIconType(product: DashboardProduct): string {
    const key = (product.iconKey || product.code || product.name || '').toLowerCase();
    if (key.includes('car')) return 'car';
    if (key.includes('bike') || key.includes('two') || key.includes('motorcycle')) return 'bike';
    if (key.includes('health') || key.includes('medic')) return 'health';
    if (key.includes('life') || key.includes('term')) return 'life';
    if (key.includes('gcv') || key.includes('truck') || key.includes('goods')) return 'gcv';
    if (key.includes('pcv') || key.includes('taxi') || key.includes('cab')) return 'pcv';
    if (key.includes('sme') || key.includes('fire') || key.includes('business')) return 'sme';
    if (key.includes('invest') || key.includes('rupee') || key.includes('money')) return 'investment';
    if (key.includes('travel') || key.includes('flight') || key.includes('plane')) return 'travel';
    if (key.includes('pet') || key.includes('dog') || key.includes('cat')) return 'pet';
    if (key.includes('misc') || key.includes('other')) return 'misc';
    if (key.includes('personal') || key.includes('accident')) return 'personal_accident';
    return 'default';
  }
}
