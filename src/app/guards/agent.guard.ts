import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth/auth';

export const agentGuard: CanActivateFn = (route, state) => {
  const authService = inject(Auth);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url },
    });
  }

  const isAgent = authService.currentUser()?.userType?.trim().toLowerCase() === 'agent';
  if (!isAgent) {
    return router.createUrlTree(['/dashboard']);
  }

  return true;
};
