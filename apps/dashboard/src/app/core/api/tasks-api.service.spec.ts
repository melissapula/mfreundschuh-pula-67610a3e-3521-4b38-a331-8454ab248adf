import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import {
    HttpTestingController,
    provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TaskCategory, TaskStatus } from '@app/data/browser';
import { TasksApiService } from './tasks-api.service';
import { environment } from '../../../environments/environment';

describe('TasksApiService', () => {
    let service: TasksApiService;
    let httpMock: HttpTestingController;
    const baseUrl = `${environment.apiUrl}/tasks`;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(), provideHttpClientTesting()],
        });
        service = TestBed.inject(TasksApiService);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('list() issues a GET to the tasks endpoint', () => {
        service.list().subscribe();

        const req = httpMock.expectOne(baseUrl);
        expect(req.request.method).toBe('GET');
        req.flush([]);
    });

    it('create() issues a POST with the new task payload', () => {
        const dto = { title: 'New task', category: TaskCategory.WORK };

        service.create(dto).subscribe();

        const req = httpMock.expectOne(baseUrl);
        expect(req.request.method).toBe('POST');
        expect(req.request.body).toEqual(dto);
        req.flush({});
    });

    it('update() issues a PUT to the task-specific URL', () => {
        const dto = { status: TaskStatus.DONE };

        service.update('t1', dto).subscribe();

        const req = httpMock.expectOne(`${baseUrl}/t1`);
        expect(req.request.method).toBe('PUT');
        expect(req.request.body).toEqual(dto);
        req.flush({});
    });

    it('remove() issues a DELETE to the task-specific URL', () => {
        service.remove('t1').subscribe();

        const req = httpMock.expectOne(`${baseUrl}/t1`);
        expect(req.request.method).toBe('DELETE');
        req.flush(null);
    });
});
