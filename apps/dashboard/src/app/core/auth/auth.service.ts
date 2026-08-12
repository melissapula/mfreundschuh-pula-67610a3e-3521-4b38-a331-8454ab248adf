import { HttpClient } from '@angular/common/http';
import { Injectable, computed, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { AuthUser } from '@app/data/browser';
import { environment } from '../../../environments/environment';

interface AuthState {
  accessToken: string;
  user: AuthUser;
}

interface LoginResponse {
  accessToken: string;
  user: AuthUser;
}

const STORAGE_KEY = 'tv-auth';

/**
 * Signals-based auth state (not NgRx) — the app's state surface is small
 * enough that a store class with signals gives the same read/derive
 * ergonomics without the boilerplate.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly state = signal<AuthState | null>(readFromStorage());

  readonly user = computed(() => this.state()?.user ?? null);
  readonly accessToken = computed(() => this.state()?.accessToken ?? null);
  readonly isAuthenticated = computed(() => this.state() !== null);
  readonly role = computed(() => this.state()?.user.role ?? null);

  constructor(private readonly http: HttpClient) {}

  login(email: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.setState(res)));
  }

  logout(): void {
    this.setState(null);
  }

  private setState(state: AuthState | null): void {
    this.state.set(state);
    if (state) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }
}

function readFromStorage(): AuthState | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthState;
  } catch {
    return null;
  }
}
