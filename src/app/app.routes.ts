import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { agentGuard } from './guards/agent.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login, canActivate: [guestGuard] },
  { path: 'signup', component: Signup, canActivate: [guestGuard] },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./components/dashboard/dashboard').then(m => m.Dashboard),
  },
  {
    path: 'admin',
    canActivate: [authGuard, adminGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./components/admin/admin-dashboard/admin-dashboard').then(m => m.AdminDashboard),
      },
      {
        path: 'enquiries',
        loadComponent: () =>
          import('./components/admin/admin-enquiry/admin-enquiry').then(m => m.AdminEnquiry),
      },
      {
        path: 'enquiries/create',
        loadComponent: () =>
          import('./components/admin/admin-enquiry-creation/admin-enquiry-creation').then(m => m.AdminEnquiryCreation),
      },
      {
        path: 'enquiries/:enquiryId',
        loadComponent: () =>
          import('./components/admin/admin-enquiry-view-details/admin-enquiry-view-details').then(
            m => m.AdminEnquiryViewDetails
          ),
      },
      { path: 'enquiry', redirectTo: 'enquiries', pathMatch: 'full' },
      {
        path: 'employees',
        loadComponent: () =>
          import('./components/admin/admin-employee/admin-employee').then(m => m.AdminEmployee),
      },
      { path: 'employee', redirectTo: 'employees', pathMatch: 'full' },
      {
        path: 'agents',
        loadComponent: () =>
          import('./components/admin/admin-agents/admin-agents').then(m => m.AdminAgents),
      },
      {
        path: 'agents/:accountId',
        loadComponent: () =>
          import('./components/admin/admin-view-agents/admin-view-agents').then(m => m.AdminViewAgents),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./components/admin/admin-reports/admin-reports').then(m => m.AdminReports),
      },
      {
        path: 'transactions',
        loadComponent: () => import('./components/admin/transaction/transaction').then(m => m.Transaction),
      },
      {
        path: 'accelerators',
        children: [
          { path: '', redirectTo: 'qr-management', pathMatch: 'full' },
          {
            path: 'qr-management',
            loadComponent: () =>
              import('./components/admin/accelerators/qr-management/qr-management').then(
                m => m.QrManagement
              ),
          },
          {
            path: 'bank-account-management',
            loadComponent: () =>
              import(
                './components/admin/accelerators/bank-account-management/bank-account-management'
              ).then(m => m.BankAccountManagement),
          },
          {
            path: 'bank-account-details/:id',
            loadComponent: () =>
              import(
                './components/admin/accelerators/bank-account-details/bank-account-details'
              ).then(m => m.BankAccountDetails),
          },
          {
            path: 'pricing-master',
            loadComponent: () =>
              import('./components/admin/accelerators/pricing-master/pricing-master').then(
                m => m.PricingMaster
              ),
          },
          {
            path: 'agent-class-management',
            loadComponent: () =>
              import('./components/admin/admin-agent-class/admin-agent-class').then(
                m => m.AdminAgentClass
              ),
          },
          {
            path: 'insurance-management',
            loadComponent: () =>
              import(
                './components/admin/accelerators/insurance-management/insurance-management'
              ).then(m => m.InsuranceManagement),
          },
          {
            path: 'vendor-management',
            loadComponent: () =>
              import(
                './components/admin/accelerators/vendor-management/vendor-management'
              ).then(m => m.VendorManagement),
          }
        ],
      },
      { path: 'accelerator', redirectTo: 'accelerators', pathMatch: 'full' },
      { path: 'qr-management', redirectTo: 'accelerators/qr-management', pathMatch: 'full' },
      { path: 'bank-account-management', redirectTo: 'accelerators/bank-account-management', pathMatch: 'full' },
      { path: 'pricing-master', redirectTo: 'accelerators/pricing-master', pathMatch: 'full' },
      { path: 'agent-class-management', redirectTo: 'accelerators/agent-class-management', pathMatch: 'full' },
      { path: 'insurance-management', redirectTo: 'accelerators/insurance-management', pathMatch: 'full' },
      { path: 'vendor-management', redirectTo: 'accelerators/vendor-management', pathMatch: 'full' }
    ],
  },
  {
    path: 'enquiry',
    canActivate: [authGuard],
    children: [
      { path: '', loadComponent: () => import('./components/enquiry/enquiry').then(m => m.Enquiry) },
      { path: 'create-enquiry', loadComponent: () => import('./components/create-enquiry/create-enquiry').then(m => m.CreateEnquiry) },
    ],
  },
  { path: 'enquiries', redirectTo: 'enquiry', pathMatch: 'full' },
  { path: 'create-enquiry', redirectTo: 'enquiry/create-enquiry', pathMatch: 'full' },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () => import('./components/profile/profile').then(m => m.Profile),
  },
  {
    path: 'employees',
    canActivate: [authGuard, agentGuard],
    loadComponent: () => import('./components/employees/employees').then(m => m.Employees),
  },

  {
    path: 'reports',
    canActivate: [authGuard],
    loadComponent: () => import('./components/reports/reports').then(m => m.Reports),
  },
  {
    path: 'quotes',
    canActivate: [authGuard],
    loadComponent: () => import('./components/quotes/quotes').then(m => m.Quotes),
  },
  {
    path: 'quote',
    canActivate: [authGuard],
    loadComponent: () => import('./components/quotes/quotes').then(m => m.Quotes),
  },
  {
    path: 'policy',
    canActivate: [authGuard],
    loadComponent: () => import('./components/policy/policy').then(m => m.Policy),
  },
  {
    path: 'rc-view',
    canActivate: [authGuard],
    loadComponent: () => import('./components/RC/rc-view/rc-view').then(m => m.RcView),
  },
  { path: '**', redirectTo: 'login' },
];
