import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Profile } from './profile';
import { AccountService } from '../../services/account/account.service';
import { Auth } from '../../services/auth/auth';
import { UserProfileData } from '../../models/account.model';

describe('Profile', () => {
  let component: Profile;
  let fixture: ComponentFixture<Profile>;
  let mockAccountService: any;
  let mockAuth: any;

  const sampleProfile: UserProfileData = {
    userId: '793b3b3e-9fed-4724-bfd2-cd80d997d78a',
    accountId: '6a06dbe5-45f7-4509-8455-0d8d636c6fc5',
    profileUrl: null,
    fullName: 'Anand Asokan',
    agencyName: 'Anand Asokan Agency',
    userName: 'anand',
    email: 'ianandasokan@gmail.com',
    phone: '9744510308',
    address: 'Thodupuzha, Kerala',
    pincode: '685584',
  };

  beforeEach(async () => {
    mockAccountService = {
      getUserProfile: (userId: string) =>
        of({
          isSuccess: true,
          data: { ...sampleProfile, userId },
          message: 'User profile fetched successfully',
          statusCode: 200,
          errors: null,
        }),
      updateUserProfile: (userId: string, payload: any) =>
        of({
          isSuccess: true,
          data: { ...sampleProfile, ...payload },
          message: 'User profile updated successfully',
          statusCode: 200,
          errors: null,
        }),
    };

    mockAuth = {
      currentUser: () => ({
        userId: '793b3b3e-9fed-4724-bfd2-cd80d997d78a',
        accountId: '6a06dbe5-45f7-4509-8455-0d8d636c6fc5',
        fullName: 'Anand Asokan',
        userType: 'Agent',
        token: 'mock-jwt-token',
      }),
    };

    await TestBed.configureTestingModule({
      imports: [Profile],
      providers: [
        provideRouter([]),
        { provide: AccountService, useValue: mockAccountService },
        { provide: Auth, useValue: mockAuth },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Profile);
    component = fixture.componentInstance;
  });

  it('should create the Profile component', () => {
    expect(component).toBeTruthy();
  });

  it('should load and populate user profile on ngOnInit', () => {
    fixture.detectChanges();

    expect(component.profile()).toBeTruthy();
    expect(component.profile()?.userName).toBe('anand');
    expect(component.userName()).toBe('anand');
    expect(component.email()).toBe('ianandasokan@gmail.com');
    expect(component.phone()).toBe('9744510308');
    expect(component.address()).toBe('Thodupuzha, Kerala');
    expect(component.pincode()).toBe('685584');
    expect(component.isDirty()).toBe(false);
  });

  it('should compute user initials correctly', () => {
    expect(component.getUserInitials('Anand Asokan')).toBe('AA');
    expect(component.getUserInitials('Rahul')).toBe('RA');
  });

  it('should mark form as dirty when fields change', () => {
    fixture.detectChanges();
    expect(component.isDirty()).toBe(false);

    component.userName.set('anand.updated');
    component.onFieldChange();
    expect(component.isDirty()).toBe(true);
  });

  it('should fail validation when username, email, or phone are invalid', () => {
    fixture.detectChanges();

    component.userName.set('');
    component.email.set('invalid-email');
    component.phone.set('123');
    component.pincode.set('12');

    const isValid = component.validate();
    expect(isValid).toBe(false);
    expect(component.fieldErrors()['userName']).toBeTruthy();
    expect(component.fieldErrors()['email']).toBeTruthy();
    expect(component.fieldErrors()['phone']).toBeTruthy();
    expect(component.fieldErrors()['pincode']).toBeTruthy();
  });

  it('should pass validation with valid data and submit profile update', () => {
    fixture.detectChanges();

    component.userName.set('anand.new');
    component.email.set('new.email@example.com');
    component.phone.set('9876543210');
    component.address.set('Cochin, Kerala');
    component.pincode.set('682001');

    let submittedUserId = '';
    let submittedPayload: any = null;

    mockAccountService.updateUserProfile = (userId: string, payload: any) => {
      submittedUserId = userId;
      submittedPayload = payload;
      return of({
        isSuccess: true,
        data: { ...sampleProfile, ...payload },
        message: 'Saved',
      });
    };

    component.saveProfile();

    expect(submittedUserId).toBe('793b3b3e-9fed-4724-bfd2-cd80d997d78a');
    expect(submittedPayload.userName).toBe('anand.new');
    expect(submittedPayload.email).toBe('new.email@example.com');
    expect(submittedPayload.phone).toBe('9876543210');
    expect(submittedPayload.address).toBe('Cochin, Kerala');
    expect(submittedPayload.pincode).toBe('682001');
    expect(component.isDirty()).toBe(false);
    expect(component.successMessage()).toBe('Profile details updated successfully.');
  });

  it('should reset form fields back to profile values on resetForm()', () => {
    fixture.detectChanges();

    component.userName.set('temporary.name');
    component.email.set('temporary@example.com');
    component.isDirty.set(true);

    component.resetForm();

    expect(component.userName()).toBe('anand');
    expect(component.email()).toBe('ianandasokan@gmail.com');
    expect(component.isDirty()).toBe(false);
  });

  it('should handle error when profile fetch fails', () => {
    mockAccountService.getUserProfile = () =>
      throwError(() => ({
        error: { message: 'Server error retrieving profile' },
      }));

    fixture.detectChanges();

    expect(component.profile()).toBeNull();
    expect(component.errorMessage()).toBe('Server error retrieving profile');
  });

  it('should handle error when profile update fails', () => {
    fixture.detectChanges();

    mockAccountService.updateUserProfile = () =>
      throwError(() => ({
        error: { message: 'Username already taken' },
      }));

    component.userName.set('duplicate.name');
    component.saveProfile();

    expect(component.isSaving()).toBe(false);
    expect(component.errorMessage()).toBe('Username already taken');
  });

  it('should remove profile pic when removeProfilePic() is called', () => {
    fixture.detectChanges();

    component.previewProfileUrl.set('data:image/png;base64,mock');
    expect(component.previewProfileUrl()).toBeTruthy();

    component.removeProfilePic();
    expect(component.previewProfileUrl()).toBeNull();
    expect(component.isDirty()).toBe(true);
  });
});
