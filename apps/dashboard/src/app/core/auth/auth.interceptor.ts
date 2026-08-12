import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/** Attaches the JWT to every outgoing request that has one. */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  // Must inject Router here, synchronously within the interceptor's own
  // invocation — inject() has no injection context to run in once we're
  // inside the catchError callback below, which fires later/async.
  const router = inject(Router);
  const token = auth.accessToken();

  const authedReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        // Token missing/expired/invalid — the session is no longer valid
        // anywhere, so clear it and send the user back to log in.
        auth.logout();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    }),
  );
};
