import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { App } from './app';
import { Auth } from './services/auth/auth';
import { signal } from '@angular/core';
import { UserData } from './models/auth.model';

describe('App', () => {
  let authServiceMock: {
    isAuthenticated: ReturnType<typeof signal<boolean>>;
    currentUser: ReturnType<typeof signal<UserData | null>>;
  };

  beforeEach(async () => {
    authServiceMock = {
      isAuthenticated: signal(false),
      currentUser: signal<UserData | null>(null),
    };

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        { provide: Auth, useValue: authServiceMock },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should not render navbar when unauthenticated', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeNull();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should render navbar when authenticated', async () => {
    authServiceMock.currentUser.set({
      id: '1',
      fullName: 'Agent Smith',
      email: 'smith@agent.com',
      userType: 'Agent',
      accountId: 1,
      token: 'jwt-token',
    } as any);
    authServiceMock.isAuthenticated.set(true);

    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('app-navbar')).toBeTruthy();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });
});


