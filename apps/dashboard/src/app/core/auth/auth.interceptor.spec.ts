import { TestBed } from '@angular/core/testing';
import {
    HttpClient,
    provideHttpClient,
    withInterceptors,
} from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let authServiceMock: { accessToken: jest.Mock; logout: jest.Mock };
    let routerMock: { navigate: jest.Mock };

    beforeEach(() => {
        authServiceMock = {
            accessToken: jest.fn().mockReturnValue(null),
            logout: jest.fn(),
        };
        routerMock = { navigate: jest.fn() };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authInterceptor])),
                provideHttpClientTesting(),
                { provide: AuthService, useValue: authServiceMock },
                { provide: Router, useValue: routerMock },
            ],
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => httpMock.verify());

    it('attaches the Authorization header when a token is present', () => {
        authServiceMock.accessToken.mockReturnValue('the-token');

        http.get('/api/tasks').subscribe();

        const req = httpMock.expectOne('/api/tasks');
        expect(req.request.headers.get('Authorization')).toBe(
            'Bearer the-token',
        );
        req.flush([]);
    });

    it('sends no Authorization header when there is no token', () => {
        http.get('/api/tasks').subscribe();

        const req = httpMock.expectOne('/api/tasks');
        expect(req.request.headers.has('Authorization')).toBe(false);
        req.flush([]);
    });

    it('logs out and redirects to /login on a 401 response', () => {
        authServiceMock.accessToken.mockReturnValue('an-expired-token');

        http.get('/api/tasks').subscribe({ error: () => undefined });

        const req = httpMock.expectOne('/api/tasks');
        req.flush(
            { message: 'Unauthorized' },
            { status: 401, statusText: 'Unauthorized' },
        );

        expect(authServiceMock.logout).toHaveBeenCalled();
        expect(routerMock.navigate).toHaveBeenCalledWith(['/login']);
    });

    it('does not log out on non-401 errors', () => {
        http.get('/api/tasks').subscribe({ error: () => undefined });

        const req = httpMock.expectOne('/api/tasks');
        req.flush(
            { message: 'Server error' },
            { status: 500, statusText: 'Internal Server Error' },
        );

        expect(authServiceMock.logout).not.toHaveBeenCalled();
    });
});
