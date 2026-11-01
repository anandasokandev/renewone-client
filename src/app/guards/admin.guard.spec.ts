import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { adminGuard } from './admin.guard';
import { Auth } from '../services/auth/auth';
import { signal } from '@angular/core';
import { UserData } from '../models/auth.model';

describe('adminGuard', () => {
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    isAdmin: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<UserData | null>>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: signal(false),
      isAdmin: signal(false),
      currentUser: signal<UserData | null>(null),
    };
    routerMock = {
      createUrlTree: vi.fn((commands, extras) => ({ commands, extras }) as unknown as UrlTree),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: Auth, useValue: authServiceMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should redirect to /login with returnUrl when user is not authenticated', () => {
    authServiceMock.isAuthenticated.set(false);

    TestBed.runInInjectionContext(() =>
      adminGuard({} as any, { url: '/admin/dashboard' } as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin/dashboard' },
    });
  });

  it('should redirect to /dashboard when user is authenticated but not an admin', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.isAdmin.set(false);

    TestBed.runInInjectionContext(() =>
      adminGuard({} as any, { url: '/admin/dashboard' } as any)
    );

    expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should allow access when user is authenticated and is an admin', () => {
    authServiceMock.isAuthenticated.set(true);
    authServiceMock.isAdmin.set(true);

    const result = TestBed.runInInjectionContext(() =>
      adminGuard({} as any, { url: '/admin/dashboard' } as any)
    );

    expect(result).toBe(true);
  });
});

