import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = (route) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isLinkRoute = route.routeConfig?.path === 'link';

  return authService.currentUser$.pipe(
    take(1),
    map(u => {
      if (!u) return router.createUrlTree(['/login']);
      if (!u.coupleId && !isLinkRoute) return router.createUrlTree(['/link']);
      return true;
    })
  );
};
