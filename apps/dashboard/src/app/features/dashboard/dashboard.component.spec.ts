import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Role, Task, TaskCategory, TaskStatus } from '@app/data/browser';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/auth/auth.service';
import { TasksApiService } from '../../core/api/tasks-api.service';

const task: Task = {
    id: 't1',
    title: 'Existing task',
    description: '',
    category: TaskCategory.WORK,
    status: TaskStatus.TODO,
    order: 0,
    ownerId: 'owner-1',
    organizationId: 'org-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('DashboardComponent', () => {
    let api: {
        list: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        remove: jest.Mock;
    };

    beforeEach(async () => {
        api = {
            list: jest.fn().mockReturnValue(of([])),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };
        const authStub = {
            role: () => Role.ADMIN,
            user: () => ({
                sub: 'admin-1',
                email: 'admin@acme.test',
                role: Role.ADMIN,
                organizationId: 'org-1',
            }),
            logout: jest.fn(),
        };

        await TestBed.configureTestingModule({
            imports: [DashboardComponent],
            providers: [
                { provide: TasksApiService, useValue: api },
                { provide: AuthService, useValue: authStub },
                provideRouter([]),
            ],
        }).compileComponents();
    });

    function createDashboard() {
        const fixture = TestBed.createComponent(DashboardComponent);
        fixture.detectChanges();
        return fixture;
    }

    describe('saveTask failure handling', () => {
        it('keeps the dialog open and surfaces the failure inline when create fails', async () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            api.create.mockReturnValue(throwError(() => new Error('boom')));

            component.openCreate();
            expect(component.showForm()).toBe(true);
            expect(component.formError()).toBeNull();

            await component.saveTask({
                title: 'x',
                category: TaskCategory.WORK,
            });

            expect(component.showForm()).toBe(true);
            expect(component.formError()).toBe('Could not create the task.');
        });

        it('keeps the dialog open and surfaces the failure inline when update fails', async () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            api.update.mockReturnValue(throwError(() => new Error('boom')));

            component.openEdit(task);
            await component.saveTask({ title: 'renamed' });

            expect(component.showForm()).toBe(true);
            expect(component.formError()).toBe('Could not save the task.');
        });

        it('closes the dialog and clears any error when the save succeeds', async () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            api.create.mockReturnValue(of({ ...task, id: 'new-id' }));

            component.openCreate();
            await component.saveTask({
                title: 'x',
                category: TaskCategory.WORK,
            });

            expect(component.showForm()).toBe(false);
            expect(component.formError()).toBeNull();
        });
    });

    describe('formError scoping', () => {
        it('clears a stale formError when opening a fresh create dialog', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            component.formError.set('Could not save the new order.');

            component.openCreate();

            expect(component.formError()).toBeNull();
        });

        it('clears a stale formError when opening a fresh edit dialog', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            component.formError.set('Could not save the new order.');

            component.openEdit(task);

            expect(component.formError()).toBeNull();
        });

        it('clears formError when the dialog is closed', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            component.openCreate();
            component.formError.set('Could not create the task.');

            component.closeForm();

            expect(component.formError()).toBeNull();
        });
    });
});
