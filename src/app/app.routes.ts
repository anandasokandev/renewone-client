import { Routes } from '@angular/router';
import { Login } from './components/login/login';
import { Signup } from './components/signup/signup';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import { agentGuard } from './guards/agent.guard';

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

