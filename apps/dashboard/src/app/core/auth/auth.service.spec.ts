import { HttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { Role } from '@app/data/browser';
import { AuthService } from './auth.service';

function createAuthService(http: Partial<HttpClient>): AuthService {
    TestBed.configureTestingModule({
        providers: [{ provide: HttpClient, useValue: http }],
    });
    return TestBed.inject(AuthService);
}

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
        const auth = createAuthService(http);

        expect(auth.isAuthenticated()).toBe(false);
        expect(auth.user()).toBeNull();
    });

    it('starts unauthenticated when localStorage holds corrupted (non-JSON) session data', () => {
        localStorage.setItem('tv-auth', 'not valid json{{{');
        const http = { post: jest.fn() } as unknown as HttpClient;
        const auth = createAuthService(http);

        expect(auth.isAuthenticated()).toBe(false);
        expect(auth.user()).toBeNull();
        expect(auth.accessToken()).toBeNull();
        expect(auth.role()).toBeNull();
    });

    it('restores a saved session from localStorage on construction', () => {
        localStorage.setItem('tv-auth', JSON.stringify(loginResponse));
        const http = { post: jest.fn() } as unknown as HttpClient;
        const auth = createAuthService(http);

        expect(auth.isAuthenticated()).toBe(true);
        expect(auth.role()).toBe(Role.ADMIN);
    });

    it('login() updates signals and persists the session', () => {
        const http = {
            post: jest.fn().mockReturnValue(of(loginResponse)),
        } as unknown as HttpClient;
        const auth = createAuthService(http);

        auth.login('admin@acme.test', 'Password123!').subscribe();

        expect(auth.isAuthenticated()).toBe(true);
        expect(auth.accessToken()).toBe('signed.jwt.token');
        expect(JSON.parse(localStorage.getItem('tv-auth')!)).toEqual(
            loginResponse,
        );
    });

    it('logout() clears signals and localStorage', () => {
        const http = {
            post: jest.fn().mockReturnValue(of(loginResponse)),
        } as unknown as HttpClient;
        const auth = createAuthService(http);
        auth.login('admin@acme.test', 'Password123!').subscribe();

        auth.logout();

        expect(auth.isAuthenticated()).toBe(false);
        expect(auth.user()).toBeNull();
        expect(localStorage.getItem('tv-auth')).toBeNull();
    });
});
