import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { authGuard } from './auth.guard';
import { guestGuard } from './guest.guard';
import { agentGuard } from './agent.guard';
import { Auth } from '../services/auth/auth';
import { signal } from '@angular/core';
import { UserData } from '../models/auth.model';

describe('AuthGuards', () => {
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<UserData | null>>;
  };
  let routerMock: {
    createUrlTree: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    authServiceMock = {
      isAuthenticated: signal(false),
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

  describe('authGuard', () => {
    it('should allow access when user is authenticated', () => {
      authServiceMock.isAuthenticated.set(true);

      const result = TestBed.runInInjectionContext(() =>
        authGuard({} as any, { url: '/dashboard' } as any)
      );

      expect(result).toBe(true);
    });

    it('should redirect to /login with returnUrl when user is not authenticated', () => {
      authServiceMock.isAuthenticated.set(false);

      TestBed.runInInjectionContext(() =>
        authGuard({} as any, { url: '/enquiry' } as any)
      );

      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/enquiry' },
      });
    });
  });

  describe('guestGuard', () => {
    it('should redirect authenticated user to /dashboard', () => {
      authServiceMock.isAuthenticated.set(true);

      TestBed.runInInjectionContext(() =>
        guestGuard({} as any, { url: '/login' } as any)
      );

      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should allow unauthenticated user to access login/signup', () => {
      authServiceMock.isAuthenticated.set(false);

      const result = TestBed.runInInjectionContext(() =>
        guestGuard({} as any, { url: '/login' } as any)
      );

      expect(result).toBe(true);
    });
  });

  describe('agentGuard', () => {
    it('should allow access when authenticated user has Agent role', () => {
      authServiceMock.isAuthenticated.set(true);
      authServiceMock.currentUser.set({
        userId: '1',
        fullName: 'Agent Name',
        userType: 'Agent',
        accountId: 'acc1',
        token: 'token123',
      });

      const result = TestBed.runInInjectionContext(() =>
        agentGuard({} as any, { url: '/employees' } as any)
      );

      expect(result).toBe(true);
    });

    it('should redirect to /dashboard when authenticated user has Staff role', () => {
      authServiceMock.isAuthenticated.set(true);
      authServiceMock.currentUser.set({
        userId: '2',
        fullName: 'Staff Name',
        userType: 'Staff',
        accountId: 'acc1',
        token: 'token123',
      });

      TestBed.runInInjectionContext(() =>
        agentGuard({} as any, { url: '/employees' } as any)
      );

      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/dashboard']);
    });

    it('should redirect to /login with returnUrl when user is not authenticated', () => {
      authServiceMock.isAuthenticated.set(false);

      TestBed.runInInjectionContext(() =>
        agentGuard({} as any, { url: '/employees' } as any)
      );

      expect(routerMock.createUrlTree).toHaveBeenCalledWith(['/login'], {
        queryParams: { returnUrl: '/employees' },
      });
    });
  });
});

