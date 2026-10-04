import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';

import { of, throwError } from 'rxjs';
import { Signup } from './signup';
import { AccountService } from '../../services/account/account.service';

describe('Signup', () => {
  let component: Signup;
  let fixture: ComponentFixture<Signup>;
  let accountServiceMock: {
    registerAgent: ReturnType<typeof vi.fn>;
  };
  let router: Router;

  beforeEach(async () => {
    accountServiceMock = {
      registerAgent: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [Signup],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: AccountService, useValue: accountServiceMock },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate');

    fixture = TestBed.createComponent(Signup);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create the Signup component', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize with an invalid form', () => {
    expect(component.signupForm.valid).toBe(false);
  });

  it('should require mandatory fields (agentName, userName, contactNumber, email, password, confirmPassword)', () => {
    const form = component.signupForm;
    expect(form.get('agentName')?.valid).toBe(false);
    expect(form.get('userName')?.valid).toBe(false);
    expect(form.get('contactNumber')?.valid).toBe(false);
    expect(form.get('email')?.valid).toBe(false);
    expect(form.get('password')?.valid).toBe(false);
    expect(form.get('confirmPassword')?.valid).toBe(false);

    // Address & Pincode should be optional
    expect(form.get('address')?.valid).toBe(true);
    expect(form.get('pincode')?.valid).toBe(true);
  });

  it('should validate password confirmation mismatch', () => {
    component.signupForm.patchValue({
      password: 'Password123',
      confirmPassword: 'MismatchPassword',
    });

    component.signupForm.updateValueAndValidity();
    expect(component.signupForm.get('confirmPassword')?.hasError('passwordMismatch')).toBe(true);
  });

  it('should submit registration payload when valid', () => {
    vi.useFakeTimers();
    accountServiceMock.registerAgent.mockReturnValue(
      of({
        isSuccess: true,
        message: 'Agent registered successfully',
        data: null,
      })
    );

    component.signupForm.patchValue({
      agentName: 'Apex Advisory',
      userName: 'apex.agent',
      contactNumber: '9876543210',
      email: 'agent@apex.com',
      password: 'SecretPassword123',
      confirmPassword: 'SecretPassword123',
      address: '101 Marine Lines',
      pincode: '400020',
    });

    component.onSubmit();

    expect(accountServiceMock.registerAgent).toHaveBeenCalledWith({
      agentName: 'Apex Advisory',
      userName: 'apex.agent',
      contactNumber: '9876543210',
      email: 'agent@apex.com',
      password: 'SecretPassword123',
      address: '101 Marine Lines',
      pincode: '400020',
    });

    expect(component.successMessage()).toBe('Agent registered successfully');
    vi.advanceTimersByTime(2000);
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
    vi.useRealTimers();
  });


  it('should display error message on registration API failure', () => {
    accountServiceMock.registerAgent.mockReturnValue(
      throwError(() => ({
        error: { message: 'Username already taken' },
      }))
    );

    component.signupForm.patchValue({
      agentName: 'Apex Advisory',
      userName: 'apex.agent',
      contactNumber: '9876543210',
      email: 'agent@apex.com',
      password: 'SecretPassword123',
      confirmPassword: 'SecretPassword123',
    });

    component.onSubmit();

    expect(component.errorMessage()).toBe('Username already taken');
    expect(component.isLoading()).toBe(false);
  });

  it('should toggle password visibility flags', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);

    expect(component.showConfirmPassword()).toBe(false);
    component.toggleConfirmPasswordVisibility();
    expect(component.showConfirmPassword()).toBe(true);
  });
});
