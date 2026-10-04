import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AccountService } from '../../services/account/account.service';
import { RegisterAgentPayload } from '../../models/account.model';

@Component({
  selector: 'app-signup',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  private fb = inject(FormBuilder);
  private accountService = inject(AccountService);
  private router = inject(Router);

  isLoading = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);

  signupForm = this.fb.group(
    {
      agentName: ['', [Validators.required, Validators.minLength(2)]],
      userName: ['', [Validators.required, Validators.minLength(3)]],
      contactNumber: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      address: [''],
      pincode: ['', [Validators.pattern(/^$|^[0-9]{6}$/)]],
    },
    {
      validators: [this.passwordMatchValidator],
    }
  );

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    if (password && confirmPassword && password !== confirmPassword) {
      control.get('confirmPassword')?.setErrors({ passwordMismatch: true });
      return { passwordMismatch: true };
    }
    if (control.get('confirmPassword')?.hasError('passwordMismatch')) {
      control.get('confirmPassword')?.setErrors(null);
    }
    return null;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((val) => !val);
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((val) => !val);
  }

  onSubmit(): void {
    if (this.signupForm.invalid) {
      this.signupForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const val = this.signupForm.getRawValue();

    const payload: RegisterAgentPayload = {
      agentName: (val.agentName || '').trim(),
      userName: (val.userName || '').trim(),
      contactNumber: (val.contactNumber || '').trim(),
      email: (val.email || '').trim().toLowerCase(),
      password: val.password || '',
      address: val.address?.trim() || undefined,
      pincode: val.pincode?.trim() || undefined,
    };

    this.accountService.registerAgent(payload).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.isSuccess) {
          this.successMessage.set(
            res.message || 'Agent account created successfully! Redirecting to login...'
          );
          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 2000);
        } else {
          this.errorMessage.set(res.message || 'Registration failed. Please check your details.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(this.extractErrorMessage(err));
      },
    });
  }

  private extractErrorMessage(err: any): string {
    if (err?.error?.message) {
      return err.error.message;
    }
    if (typeof err?.error === 'string') {
      return err.error;
    }
    if (err?.error?.errors) {
      const errObj = err.error.errors;
      const firstKey = Object.keys(errObj)[0];
      if (firstKey && Array.isArray(errObj[firstKey]) && errObj[firstKey].length > 0) {
        return errObj[firstKey][0];
      }
    }
    return err?.message || 'An error occurred during registration. Please try again.';
  }
}
