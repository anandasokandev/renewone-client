import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { AccountService } from '../../services/account/account.service';
import { Auth } from '../../services/auth/auth';
import { UpdateUserProfilePayload, UserProfileData } from '../../models/account.model';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './profile.html',
  styleUrl: './profile.css',
})
export class Profile implements OnInit {
  private accountService = inject(AccountService);
  protected authService = inject(Auth);

  // State Signals
  profile = signal<UserProfileData | null>(null);
  isLoading = signal<boolean>(false);
  isSaving = signal<boolean>(false);
  errorMessage = signal<string | null>(null);
  successMessage = signal<string | null>(null);
  isDirty = signal<boolean>(false);

  // Editable Form Signals
  userName = signal<string>('');
  email = signal<string>('');
  phone = signal<string>('');
  address = signal<string>('');
  pincode = signal<string>('');
  previewProfileUrl = signal<string | null>(null);

  // Field Validation Errors
  fieldErrors = signal<{ [key: string]: string }>({});

  ngOnInit(): void {
    const user = this.authService.currentUser();
    const userId = user?.userId;

    if (userId) {
      this.loadUserProfile(userId);
    } else {
      this.errorMessage.set('Active user session not found. Please log in again.');
    }
  }

  loadUserProfile(userId: string): void {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.accountService.getUserProfile(userId).subscribe({
      next: (res) => {
        this.isLoading.set(false);
        if (res.isSuccess && res.data) {
          this.profile.set(res.data);
          this.populateForm(res.data);
        } else {
          this.errorMessage.set(res.message || 'Unable to load profile data.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        const errDesc =
          err?.error?.message ||
          err?.message ||
          'Failed to connect to profile service. Please verify your connection.';
        this.errorMessage.set(errDesc);
      },
    });
  }

  populateForm(data: UserProfileData): void {
    this.userName.set(data.userName || '');
    this.email.set(data.email || '');
    this.phone.set(data.phone || '');
    this.address.set(data.address || '');
    this.pincode.set(data.pincode || '');
    this.previewProfileUrl.set(data.profileUrl || null);
    this.fieldErrors.set({});
    this.isDirty.set(false);
  }

  onFieldChange(): void {
    this.isDirty.set(true);
    this.clearMessages();
  }

  onProfilePicSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validate file size (< 5MB) and type
      if (!file.type.startsWith('image/')) {
        this.fieldErrors.update((e) => ({ ...e, ['profilePic']: 'Only image files are permitted.' }));
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.fieldErrors.update((e) => ({ ...e, ['profilePic']: 'Image must be under 5MB.' }));
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        this.previewProfileUrl.set(reader.result as string);
        this.isDirty.set(true);
        this.fieldErrors.update((e) => {
          const updated = { ...e };
          delete updated['profilePic'];
          return updated;
        });
      };
      reader.readAsDataURL(file);
    }
  }

  removeProfilePic(): void {
    this.previewProfileUrl.set(null);
    this.isDirty.set(true);
    this.clearMessages();
  }

  getUserInitials(name?: string): string {
    const target = name || this.profile()?.fullName || this.authService.currentUser()?.fullName || 'Agent';
    const parts = target.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return target.slice(0, 2).toUpperCase();
  }

  validate(): boolean {
    const errors: { [key: string]: string } = {};

    const uName = this.userName().trim();
    if (!uName) {
      errors['userName'] = 'Username is required.';
    } else if (uName.length < 3) {
      errors['userName'] = 'Username must be at least 3 characters.';
    }

    const em = this.email().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!em) {
      errors['email'] = 'Email address is required.';
    } else if (!emailRegex.test(em)) {
      errors['email'] = 'Enter a valid email address (e.g. name@domain.com).';
    }

    const ph = this.phone().trim();
    const phoneRegex = /^[6-9]\d{9}$/;
    if (!ph) {
      errors['phone'] = 'Mobile phone number is required.';
    } else if (!phoneRegex.test(ph)) {
      errors['phone'] = 'Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9.';
    }

    const pin = this.pincode().trim();
    if (pin && !/^\d{6}$/.test(pin)) {
      errors['pincode'] = 'Postal pincode must be exactly 6 digits.';
    }

    this.fieldErrors.set(errors);
    return Object.keys(errors).length === 0;
  }

  saveProfile(): void {
    this.clearMessages();

    if (!this.validate()) {
      return;
    }

    const current = this.profile();
    if (!current) {
      this.errorMessage.set('Profile data not available for submission.');
      return;
    }

    const payload: UpdateUserProfilePayload = {
      userId: current.userId,
      accountId: current.accountId,
      profileUrl: this.previewProfileUrl(),
      fullName: current.fullName,
      agencyName: current.agencyName,
      userName: this.userName().trim(),
      email: this.email().trim(),
      phone: this.phone().trim(),
      address: this.address().trim() || null,
      pincode: this.pincode().trim() || null,
    };

    this.isSaving.set(true);

    this.accountService.updateUserProfile(current.userId, payload).subscribe({
      next: (res) => {
        this.isSaving.set(false);
        this.isDirty.set(false);

        // Update local state with the returned data or payload
        const updatedProfile: UserProfileData = {
          ...current,
          ...payload,
          ...(res.data || {}),
        };
        this.profile.set(updatedProfile);
        this.populateForm(updatedProfile);

        this.successMessage.set('Profile details updated successfully.');
        setTimeout(() => {
          this.successMessage.set(null);
        }, 5000);
      },
      error: (err) => {
        this.isSaving.set(false);
        const msg =
          err?.error?.message ||
          err?.message ||
          'Failed to update profile. Please try again.';
        this.errorMessage.set(msg);
      },
    });
  }

  resetForm(): void {
    const current = this.profile();
    if (current) {
      this.populateForm(current);
      this.clearMessages();
    }
  }

  clearMessages(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
