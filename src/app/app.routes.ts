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
        path: 'reports',
        loadComponent: () =>
          import('./components/admin/admin-reports/admin-reports').then(m => m.AdminReports),
      },
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
