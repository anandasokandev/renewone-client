import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../services/auth/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginRequest } from '../../models/auth.model';

@Component({
  selector: 'app-login',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {

  private fb = inject(FormBuilder);
  private authService = inject(Auth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  isLoading = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  loginForm = this.fb.nonNullable.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]],
    rememberMe: [false]
  });

  togglePasswordVisibility() : void {
    this.showPassword.update((value) => !value);
  }

  onSubmit() : void {
    if(this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    
    const formValue = this.loginForm.getRawValue();

    const payload: LoginRequest = {
      userName: formValue.username,
      password: formValue.password
    };

    this.authService.login(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if(res.isSuccess && res.data) {
          const storage = formValue.rememberMe ? localStorage : sessionStorage;
          storage.setItem('token', res.data.token);
          storage.setItem('user', JSON.stringify(res.data));
          storage.setItem('accountId', JSON.stringify(res.data.accountId));

          const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/enquiry';
          this.router.navigateByUrl(returnUrl);
        } else {
          this.errorMessage.set(res.message || 'Login failed. Please try again.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err?.error?.message || 'An error occurred. Please try again.');
      }
    });
  }
}

