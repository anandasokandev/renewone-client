import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Login } from './login';
import { Auth } from '../../services/auth/auth';
import { ApiResponse } from '../../models/response.model';
import { UserData } from '../../models/auth.model';

describe('Login', () => {
  let component: Login;
  let fixture: ComponentFixture<Login>;
  let authService: Auth;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Login],
      providers: [provideRouter([]), provideHttpClient()],
    }).compileComponents();

    fixture = TestBed.createComponent(Login);
    component = fixture.componentInstance;
    authService = TestBed.inject(Auth);
    router = TestBed.inject(Router);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should redirect to /admin/dashboard when accountId is null and userType is SuperAdmin', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const mockUser: UserData = {
      userId: 'u1',
      token: 'jwt-token',
      fullName: 'Super Admin',
      userType: 'SuperAdmin',
      accountId: null,
    };
    const mockResponse: ApiResponse<UserData> = {
      isSuccess: true,
      data: mockUser,
      message: 'Success',
      statusCode: 200,
      errors: null,
    };

    vi.spyOn(authService, 'login').mockReturnValue(of(mockResponse));

    component.loginForm.setValue({
      username: 'admin@test.com',
      password: 'password123',
      rememberMe: false,
    });

    component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith('/admin/dashboard');
  });

  it('should redirect to /admin/dashboard when accountId is null and userType is Supervisor or AdminEmployee', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    for (const role of ['Supervisor', 'AdminEmployee']) {
      const mockUser: UserData = {
        userId: 'u2',
        token: 'jwt-token',
        fullName: 'Supervisor User',
        userType: role,
        accountId: null,
      };
      const mockResponse: ApiResponse<UserData> = {
        isSuccess: true,
        data: mockUser,
        message: 'Success',
        statusCode: 200,
        errors: null,
      };

      vi.spyOn(authService, 'login').mockReturnValue(of(mockResponse));

      component.loginForm.setValue({
        username: 'user@test.com',
        password: 'password123',
        rememberMe: false,
      });

      component.onSubmit();

      expect(navigateSpy).toHaveBeenCalledWith('/admin/dashboard');
    }
  });

  it('should redirect to /enquiry when accountId is present for admin users', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const mockUser: UserData = {
      userId: 'u3',
      token: 'jwt-token',
      fullName: 'Super Admin With Account',
      userType: 'SuperAdmin',
      accountId: 'acc-123',
    };
    const mockResponse: ApiResponse<UserData> = {
      isSuccess: true,
      data: mockUser,
      message: 'Success',
      statusCode: 200,
      errors: null,
    };

    vi.spyOn(authService, 'login').mockReturnValue(of(mockResponse));

    component.loginForm.setValue({
      username: 'admin@test.com',
      password: 'password123',
      rememberMe: false,
    });

    component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith('/enquiry');
  });

  it('should redirect to /enquiry when userType is Agent even if accountId is null', () => {
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const mockUser: UserData = {
      userId: 'u4',
      token: 'jwt-token',
      fullName: 'Agent User',
      userType: 'Agent',
      accountId: null,
    };
    const mockResponse: ApiResponse<UserData> = {
      isSuccess: true,
      data: mockUser,
      message: 'Success',
      statusCode: 200,
      errors: null,
    };

    vi.spyOn(authService, 'login').mockReturnValue(of(mockResponse));

    component.loginForm.setValue({
      username: 'agent@test.com',
      password: 'password123',
      rememberMe: false,
    });

    component.onSubmit();

    expect(navigateSpy).toHaveBeenCalledWith('/enquiry');
  });

  it('should display error message on login failure', () => {
    const mockResponse: ApiResponse<UserData> = {
      isSuccess: false,
      data: null as any,
      message: 'Invalid credentials',
      statusCode: 401,
      errors: ['Invalid credentials'],
    };

    vi.spyOn(authService, 'login').mockReturnValue(of(mockResponse));

    component.loginForm.setValue({
      username: 'fail@test.com',
      password: 'wrongpassword',
      rememberMe: false,
    });

    component.onSubmit();

    expect(component.errorMessage()).toBe('Invalid credentials');
    expect(component.isLoading()).toBe(false);
  });
});
