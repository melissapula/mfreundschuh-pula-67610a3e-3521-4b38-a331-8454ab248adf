import { HttpClient } from '@angular/common/http';
import { of } from 'rxjs';
import { Role } from '@app/data/browser';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const loginResponse = {
    accessToken: 'signed.jwt.token',
    user: {
      sub: 'u1',
      email: 'admin@acme.test',
      role: Role.ADMIN,
      organizationId: 'acme',
    },
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('starts unauthenticated when localStorage has no saved session', () => {
    const http = { post: jest.fn() } as unknown as HttpClient;
    const auth = new AuthService(http);

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
  });

  it('restores a saved session from localStorage on construction', () => {
    localStorage.setItem('tv-auth', JSON.stringify(loginResponse));
    const http = { post: jest.fn() } as unknown as HttpClient;
    const auth = new AuthService(http);

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.role()).toBe(Role.ADMIN);
  });

  it('login() updates signals and persists the session', () => {
    const http = {
      post: jest.fn().mockReturnValue(of(loginResponse)),
    } as unknown as HttpClient;
    const auth = new AuthService(http);

    auth.login('admin@acme.test', 'Password123!').subscribe();

    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.accessToken()).toBe('signed.jwt.token');
    expect(JSON.parse(localStorage.getItem('tv-auth')!)).toEqual(loginResponse);
  });

  it('logout() clears signals and localStorage', () => {
    const http = {
      post: jest.fn().mockReturnValue(of(loginResponse)),
    } as unknown as HttpClient;
    const auth = new AuthService(http);
    auth.login('admin@acme.test', 'Password123!').subscribe();

    auth.logout();

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.user()).toBeNull();
    expect(localStorage.getItem('tv-auth')).toBeNull();
  });
});
