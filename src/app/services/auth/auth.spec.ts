import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { Auth } from './auth';

describe('Auth', () => {
  let service: Auth;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()],
    });
    service = TestBed.inject(Auth);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should compute isAdmin correctly based on userType', () => {
    expect(service.isAdmin()).toBe(false);

    service.currentUser.set({
      userId: '1',
      fullName: 'Super Admin',
      userType: 'SuperAdmin',
      accountId: null,
      token: 'token',
    });
    expect(service.isAdmin()).toBe(true);

    service.currentUser.set({
      userId: '2',
      fullName: 'Supervisor User',
      userType: 'Supervisor',
      accountId: null,
      token: 'token',
    });
    expect(service.isAdmin()).toBe(true);

    service.currentUser.set({
      userId: '3',
      fullName: 'Admin Employee User',
      userType: 'AdminEmployee',
      accountId: null,
      token: 'token',
    });
    expect(service.isAdmin()).toBe(true);

    service.currentUser.set({
      userId: '4',
      fullName: 'Agent User',
      userType: 'Agent',
      accountId: 'acc1',
      token: 'token',
    });
    expect(service.isAdmin()).toBe(false);
  });
});
