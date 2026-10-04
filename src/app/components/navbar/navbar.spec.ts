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
  });

  it('should close menus on escape key press', () => {
    component.isMobileDrawerOpen.set(true);
    component.onEscapePress();
    expect(component.isMobileDrawerOpen()).toBe(false);
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
});

