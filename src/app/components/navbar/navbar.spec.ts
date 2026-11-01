import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { Navbar } from './navbar';
import { Auth } from '../../services/auth/auth';

describe('Navbar', () => {
  let component: Navbar;
  let fixture: ComponentFixture<Navbar>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Navbar],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(Navbar);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should toggle mobile drawer and close other menus', () => {
    expect(component.isMobileDrawerOpen()).toBe(false);

    component.toggleMobileDrawer();
    expect(component.isMobileDrawerOpen()).toBe(true);

    component.toggleProfileMenu();
    expect(component.isProfileMenuOpen()).toBe(true);
    expect(component.isMobileDrawerOpen()).toBe(false);

    component.toggleMobileDrawer();
    expect(component.isMobileDrawerOpen()).toBe(true);
    expect(component.isProfileMenuOpen()).toBe(false);

    component.closeMenus();
    expect(component.isMobileDrawerOpen()).toBe(false);
    expect(component.isProfileMenuOpen()).toBe(false);
    expect(component.isAcceleratorMenuOpen()).toBe(false);
    expect(component.isAcceleratorDrawerOpen()).toBe(false);
  });

  it('should close menus on escape key press', () => {
    component.isMobileDrawerOpen.set(true);
    component.isAcceleratorMenuOpen.set(true);
    component.onEscapePress();
    expect(component.isMobileDrawerOpen()).toBe(false);
    expect(component.isAcceleratorMenuOpen()).toBe(false);
  });

  it('should show employees link when logged-in user is an Agent', async () => {
    const authService = TestBed.inject(Auth);
    authService.currentUser.set({
      userId: '1',
      fullName: 'Agent Name',
      userType: 'Agent',
      accountId: '1',
      token: 'mock-token',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const desktopLinks = Array.from(compiled.querySelectorAll('.nav-menu a'));
    const hasDesktopEmployees = desktopLinks.some((el) => el.textContent?.includes('Employees'));
    expect(hasDesktopEmployees).toBe(true);

    component.isMobileDrawerOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const drawerLinks = Array.from(compiled.querySelectorAll('.drawer-nav a'));
    const hasDrawerEmployees = drawerLinks.some((el) => el.textContent?.includes('Employees'));
    expect(hasDrawerEmployees).toBe(true);
  });

  it('should hide employees link when logged-in user is not an Agent (e.g. Staff or null)', async () => {
    const authService = TestBed.inject(Auth);
    authService.currentUser.set({
      userId: '2',
      fullName: 'Staff Name',
      userType: 'Staff',
      accountId: '1',
      token: 'mock-token',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    const compiled = fixture.nativeElement as HTMLElement;
    const desktopLinks = Array.from(compiled.querySelectorAll('.nav-menu a'));
    const hasDesktopEmployees = desktopLinks.some((el) => el.textContent?.includes('Employees'));
    expect(hasDesktopEmployees).toBe(false);

    component.isMobileDrawerOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const drawerLinks = Array.from(compiled.querySelectorAll('.drawer-nav a'));
    const hasDrawerEmployees = drawerLinks.some((el) => el.textContent?.includes('Employees'));
    expect(hasDrawerEmployees).toBe(false);
  });

  it('should show admin navigation links and Accelerator menu with submenus when user is an Admin', async () => {
    const authService = TestBed.inject(Auth);
    authService.currentUser.set({
      userId: 'admin-1',
      fullName: 'Super Administrator',
      userType: 'SuperAdmin',
      accountId: null,
      token: 'mock-token',
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.isAdmin()).toBe(true);
    expect(component.homeRoute()).toBe('/admin/dashboard');

    const compiled = fixture.nativeElement as HTMLElement;
    const brandLink = compiled.querySelector('.brand-link');
    expect(brandLink?.getAttribute('href')).toBe('/admin/dashboard');

    // Primary top-level links
    const topDesktopLinks = Array.from(compiled.querySelectorAll('.nav-menu > a'));
    const topLinkTexts = topDesktopLinks.map((el) => el.textContent?.trim());
    expect(topLinkTexts).toEqual(['Dashboard', 'Enquiries', 'Employees', 'Agents', 'Reports']);

    // Accelerator dropdown trigger
    const acceleratorTrigger = compiled.querySelector('.nav-dropdown-trigger');
    expect(acceleratorTrigger).toBeTruthy();
    expect(acceleratorTrigger?.textContent).toContain('Accelerator');

    // Accelerator submenu links
    const acceleratorSubmenuLinks = Array.from(
      compiled.querySelectorAll('.nav-dropdown-menu .nav-dropdown-item')
    );
    const submenuTexts = acceleratorSubmenuLinks.map((el) => el.textContent?.trim());
    expect(submenuTexts).toEqual([
      'QR Mgmt',
      'Bank Account Mgmt',
      'Pricing Master',
      'Insurance Mgmt',
    ]);

    const submenuHrefs = acceleratorSubmenuLinks.map((el) => el.getAttribute('href'));
    expect(submenuHrefs).toEqual([
      '/admin/accelerators/qr-management',
      '/admin/accelerators/bank-account-management',
      '/admin/accelerators/pricing-master',
      '/admin/accelerators/insurance-management',
    ]);

    // Check hover/open functionality
    component.openAcceleratorMenu();
    expect(component.isAcceleratorMenuOpen()).toBe(true);

    component.closeAcceleratorMenu();
    expect(component.isAcceleratorMenuOpen()).toBe(false);

    // Check Mobile Drawer for Admin
    component.isMobileDrawerOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();

    const portalTag = compiled.querySelector('.drawer-portal-tag');
    expect(portalTag?.textContent?.trim()).toBe('Admin Portal');

    // Toggle accelerator accordion in drawer
    component.toggleAcceleratorDrawer();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(component.isAcceleratorDrawerOpen()).toBe(true);

    const drawerSubmenuLinks = Array.from(
      compiled.querySelectorAll('.drawer-submenu .drawer-submenu-link')
    );
    const drawerSubmenuTexts = drawerSubmenuLinks.map((el) => el.textContent?.trim());
    expect(drawerSubmenuTexts).toEqual([
      'QR Mgmt',
      'Bank Account Mgmt',
      'Pricing Master',
      'Insurance Mgmt',
    ]);
  });
});
