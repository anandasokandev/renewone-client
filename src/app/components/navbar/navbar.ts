import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter, finalize } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Auth } from '../../services/auth/auth';
import { ADMIN_USER_TYPES } from '../../models/auth.model';
import { EmployeeService } from '../../services/employee/employee.service';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected readonly authService = inject(Auth);
  private readonly router = inject(Router);
  private readonly elementRef = inject(ElementRef);
  private readonly employeeService = inject(EmployeeService);
  readonly employeeModulePermissions = signal<string[]>([]);
  readonly employeeRightsLoading = signal(false);

  readonly isProfileMenuOpen = signal<boolean>(false);
  readonly isMobileDrawerOpen = signal<boolean>(false);
  readonly isAcceleratorMenuOpen = signal<boolean>(false);
  readonly isAcceleratorDrawerOpen = signal<boolean>(false);
  readonly currentUrl = signal<string>(this.router?.url || '');

  constructor() {
    const user = this.authService.currentUser();
    if (user && this.isAdmin() && user.userType.trim().toLowerCase() !== 'superadmin') {
      this.employeeRightsLoading.set(true);
      this.employeeService.getEmployeeRights(user.userId)
        .pipe(takeUntilDestroyed())
        .pipe(finalize(() => this.employeeRightsLoading.set(false)))
        .subscribe({
          next: (response) => this.employeeModulePermissions.set(response.isSuccess ? response.data?.modulePermissions ?? [] : []),
          error: () => this.employeeModulePermissions.set([]),
        });
    }
    if (this.router && this.router.events) {
      this.router.events
        .pipe(
          filter((e): e is NavigationEnd => e instanceof NavigationEnd),
          takeUntilDestroyed()
        )
        .subscribe((e) => {
          this.currentUrl.set(e.urlAfterRedirects);
        });
    }
  }

  readonly isAgent = computed<boolean>(() => {
    if (typeof this.authService.isAgent === 'function') {
      return this.authService.isAgent();
    }
    return this.authService.currentUser()?.userType?.trim().toLowerCase() === 'agent';
  });

  readonly isAdmin = computed<boolean>(() => {
    if (typeof this.authService.isAdmin === 'function') {
      return this.authService.isAdmin();
    }
    const userType = this.authService.currentUser()?.userType?.trim().toLowerCase();
    return !!userType && ADMIN_USER_TYPES.some((role) => role.toLowerCase() === userType);
  });

  readonly isAcceleratorActive = computed<boolean>(() => {
    const url = this.currentUrl();
    return (
      url.includes('/admin/accelerators') ||
      url.includes('/admin/accelerator') ||
      url.includes('/admin/qr-management') ||
      url.includes('/admin/bank-account-management') ||
      url.includes('/admin/pricing-master') ||
      url.includes('/admin/insurance-management') || url.includes('/admin/vendor-management')
    );
  });

  readonly homeRoute = computed<string>(() => (this.isAdmin() ? '/admin/dashboard' : '/dashboard'));

  hasModule(moduleName: string): boolean {
    const userType = this.authService.currentUser()?.userType?.trim().toLowerCase();
    if (userType === 'superadmin') return true;
    if (userType !== 'supervisor' && userType !== 'adminemployee') return true;
    return this.employeeModulePermissions().some((permission) => permission.trim().toLowerCase() === moduleName.toLowerCase());
  }

  getUserInitials(): string {
    const name = this.authService.currentUser()?.fullName;
    if (!name) return 'U';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  toggleProfileMenu(): void {
    this.isProfileMenuOpen.update((v) => !v);
    if (this.isProfileMenuOpen()) {
      this.isMobileDrawerOpen.set(false);
      this.isAcceleratorMenuOpen.set(false);
    }
  }

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen.update((v) => !v);
    if (this.isMobileDrawerOpen()) {
      this.isProfileMenuOpen.set(false);
      this.isAcceleratorMenuOpen.set(false);
    }
  }

  toggleAcceleratorMenu(): void {
    this.isAcceleratorMenuOpen.update((v) => !v);
    if (this.isAcceleratorMenuOpen()) {
      this.isProfileMenuOpen.set(false);
    }
  }

  openAcceleratorMenu(): void {
    this.isAcceleratorMenuOpen.set(true);
  }

  closeAcceleratorMenu(): void {
    this.isAcceleratorMenuOpen.set(false);
  }

  toggleAcceleratorDrawer(): void {
    this.isAcceleratorDrawerOpen.update((v) => !v);
  }

  closeMenus(): void {
    this.isProfileMenuOpen.set(false);
    this.isMobileDrawerOpen.set(false);
    this.isAcceleratorMenuOpen.set(false);
    this.isAcceleratorDrawerOpen.set(false);
  }

  onLogout(): void {
    this.closeMenus();
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.elementRef.nativeElement.contains(event.target)) {
      this.closeMenus();
    }
  }

  @HostListener('window:keydown.escape')
  onEscapePress(): void {
    this.closeMenus();
  }
}
