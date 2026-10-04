import { CommonModule } from '@angular/common';
import { Component, computed, ElementRef, HostListener, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../services/auth/auth';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './navbar.html',
  styleUrl: './navbar.css',
})
export class Navbar {
  protected authService = inject(Auth);
  private router = inject(Router);
  private elementRef = inject(ElementRef);

  isProfileMenuOpen = signal<boolean>(false);
  isMobileDrawerOpen = signal<boolean>(false);

  isAgent = computed<boolean>(() => {
    return this.authService.currentUser()?.userType?.trim().toLowerCase() === 'agent';
  });


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
    }
  }

  toggleMobileDrawer(): void {
    this.isMobileDrawerOpen.update((v) => !v);
    if (this.isMobileDrawerOpen()) {
      this.isProfileMenuOpen.set(false);
    }
  }

  closeMenus(): void {
    this.isProfileMenuOpen.set(false);
    this.isMobileDrawerOpen.set(false);
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

