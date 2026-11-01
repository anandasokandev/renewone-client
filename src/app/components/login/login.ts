import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';
import { Auth } from '../../services/auth/auth';
import { LoginRequest, UserData } from '../../models/auth.model';

export const ADMIN_USER_TYPES = ['SuperAdmin', 'Supervisor', 'AdminEmployee'] as const;
export type AdminUserType = (typeof ADMIN_USER_TYPES)[number];

@Component({
  selector: 'app-login',
  imports: [RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  readonly isLoading = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);
  readonly errorMessage = signal<string | null>(null);

  readonly loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  togglePasswordVisibility(): void {
    this.showPassword.update((value) => !value);
  }

  onSubmit(): void {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    const formValue = this.loginForm.getRawValue();

    const payload: LoginRequest = {
      userName: formValue.username,
      password: formValue.password,
    };

    this.authService
      .login(payload)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.isLoading.set(false))
      )
      .subscribe({
        next: (res) => {
          if (res.isSuccess && res.data) {
            this.handleSuccessfulLogin(res.data, formValue.rememberMe);
          } else {
            this.errorMessage.set(res.message || 'Login failed. Please try again.');
          }
        },
        error: (err) => {
          this.errorMessage.set(err?.error?.message || 'An error occurred. Please try again.');
        },
      });
  }

  private handleSuccessfulLogin(user: UserData, rememberMe: boolean): void {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('token', user.token);
    storage.setItem('user', JSON.stringify(user));

    if (user.accountId) {
      storage.setItem('accountId', JSON.stringify(user.accountId));
    } else {
      storage.removeItem('accountId');
      sessionStorage.removeItem('accountId');
    }

    const redirectUrl = this.resolveRedirectUrl(user);
    this.router.navigateByUrl(redirectUrl);
  }

  private resolveRedirectUrl(user: UserData): string {
    const isAccountIdNull = !user.accountId;
    const normalizedUserType = user.userType?.trim().toLowerCase();
    const isAdmin = ADMIN_USER_TYPES.some(
      (role) => role.toLowerCase() === normalizedUserType
    );

    if (isAccountIdNull && isAdmin) {
      return '/admin/dashboard';
    }

    const rawReturnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    // Ensure relative returnUrl to prevent open redirect vulnerabilities
    if (rawReturnUrl && rawReturnUrl.startsWith('/') && !rawReturnUrl.startsWith('//')) {
      return rawReturnUrl;
    }

    return '/enquiry';
  }
}
