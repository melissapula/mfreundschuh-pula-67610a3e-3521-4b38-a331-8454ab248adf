import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { of, throwError } from 'rxjs';
import { Role, Task, TaskCategory, TaskStatus } from '@app/data/browser';
import { DashboardComponent } from './dashboard.component';
import { AuthService } from '../../core/auth/auth.service';
import { TasksApiService } from '../../core/api/tasks-api.service';

function makeDropEvent(options: {
    previousContainerId: string;
    previousData: Task[];
    containerData?: Task[];
    previousIndex: number;
    currentIndex: number;
}): CdkDragDrop<Task[]> {
    const previousContainer = {
        id: options.previousContainerId,
        data: options.previousData,
    };
    const container = options.containerData
        ? { id: 'other-column', data: options.containerData }
        : previousContainer;
    return {
        previousContainer,
        container,
        previousIndex: options.previousIndex,
        currentIndex: options.currentIndex,
    } as unknown as CdkDragDrop<Task[]>;
}

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
    let currentRole: Role;
    let logoutSpy: jest.Mock;

    beforeEach(async () => {
        api = {
            list: jest.fn().mockReturnValue(of([])),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };
        currentRole = Role.ADMIN;
        logoutSpy = jest.fn();
        const authStub = {
            role: () => currentRole,
            user: () => ({
                sub: 'admin-1',
                email: 'admin@acme.test',
                role: currentRole,
                organizationId: 'org-1',
            }),
            logout: logoutSpy,
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

        it("also clears the board-level banner on close when this dialog's own save is what set it", async () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            api.create.mockReturnValue(throwError(() => new Error('boom')));
            component.openCreate();
            await component.saveTask({
                title: 'x',
                category: TaskCategory.WORK,
            });
            expect(component.store.mutationError()).not.toBeNull();

            component.closeForm();

            expect(component.store.mutationError()).toBeNull();
        });

        it("leaves an unrelated board-level banner alone on close — a dialog that never failed shouldn't dismiss someone else's error", async () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            // An unrelated failure (e.g. a failed drag) sets the board-level
            // banner before the dialog is ever opened.
            api.remove.mockReturnValue(throwError(() => new Error('boom')));
            await expect(component.store.remove('t1')).rejects.toThrow();
            expect(component.store.mutationError()).not.toBeNull();

            component.openCreate();
            component.closeForm();

            expect(component.store.mutationError()).not.toBeNull();
        });
    });

    describe('onDrop', () => {
        it('does nothing when the actor cannot mutate tasks (e.g. a Viewer)', () => {
            currentRole = Role.VIEWER;
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            const reorderSpy = jest.spyOn(component.store, 'reorderColumn');

            component.onDrop(
                makeDropEvent({
                    previousContainerId: TaskStatus.TODO,
                    previousData: [task],
                    previousIndex: 0,
                    currentIndex: 0,
                }),
                TaskStatus.TODO,
            );

            expect(reorderSpy).not.toHaveBeenCalled();
        });

        it('reorders within the same column with a single reorderColumn call', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            const reorderSpy = jest
                .spyOn(component.store, 'reorderColumn')
                .mockResolvedValue();
            const other = { ...task, id: 't2' };

            component.onDrop(
                makeDropEvent({
                    previousContainerId: TaskStatus.TODO,
                    previousData: [task, other],
                    previousIndex: 0,
                    currentIndex: 1,
                }),
                TaskStatus.TODO,
            );

            expect(reorderSpy).toHaveBeenCalledTimes(1);
            expect(reorderSpy).toHaveBeenCalledWith(TaskStatus.TODO, [
                't2',
                't1',
            ]);
        });

        it('reorders both columns with two reorderColumn calls on a cross-column drop', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            const reorderSpy = jest
                .spyOn(component.store, 'reorderColumn')
                .mockResolvedValue();
            const destTask = { ...task, id: 't2', status: TaskStatus.DONE };

            component.onDrop(
                makeDropEvent({
                    previousContainerId: TaskStatus.TODO,
                    previousData: [task],
                    containerData: [destTask],
                    previousIndex: 0,
                    currentIndex: 0,
                }),
                TaskStatus.DONE,
            );

            expect(reorderSpy).toHaveBeenCalledTimes(2);
            expect(reorderSpy).toHaveBeenCalledWith(TaskStatus.TODO, []);
            expect(reorderSpy).toHaveBeenCalledWith(TaskStatus.DONE, [
                't1',
                't2',
            ]);
        });
    });

    describe('deleteTask', () => {
        it('calls store.remove()', async () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            api.remove.mockReturnValue(of(undefined));

            await component.deleteTask(task);

            expect(api.remove).toHaveBeenCalledWith('t1');
        });

        it('does not rethrow when store.remove() fails — the error is surfaced via store.mutationError()', async () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            api.remove.mockReturnValue(throwError(() => new Error('boom')));

            await expect(component.deleteTask(task)).resolves.toBeUndefined();
            expect(component.store.mutationError()).toBe(
                'Could not delete the task.',
            );
        });
    });

    describe('logout', () => {
        it('logs out and navigates to /login', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            const router = TestBed.inject(Router);
            const navigateSpy = jest
                .spyOn(router, 'navigateByUrl')
                .mockResolvedValue(true);

            component.logout();

            expect(logoutSpy).toHaveBeenCalled();
            expect(navigateSpy).toHaveBeenCalledWith('/login');
        });
    });

    describe('onKeydown', () => {
        function press(
            key: string,
            targetTagName = 'BODY',
            isContentEditable = false,
        ): void {
            const target = document.createElement(
                targetTagName === 'BODY' ? 'div' : targetTagName,
            );
            Object.defineProperty(target, 'tagName', {
                value: targetTagName,
            });
            Object.defineProperty(target, 'isContentEditable', {
                value: isContentEditable,
            });
            const event = new KeyboardEvent('keydown', {
                key,
                cancelable: true,
            });
            Object.defineProperty(event, 'target', { value: target });
            document.dispatchEvent(event);
        }

        it("'n' opens the create dialog", () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;

            press('n');

            expect(component.showForm()).toBe(true);
        });

        it("'/' focuses the search input", () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            const focusSpy = jest.fn();
            component.searchInput = {
                nativeElement: { focus: focusSpy },
            } as unknown as typeof component.searchInput;

            press('/');

            expect(focusSpy).toHaveBeenCalled();
        });

        it('ignores shortcuts while the user is typing in an input', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;

            press('n', 'INPUT');

            expect(component.showForm()).toBe(false);
        });

        it('ignores shortcuts while typing in a contenteditable element', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;

            press('n', 'DIV', true);

            expect(component.showForm()).toBe(false);
        });

        it('ignores shortcuts while the task dialog is already open', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;
            component.openCreate();
            component.closeForm();
            component.openEdit(task); // showForm() is true again

            press('/');

            // No assertion possible on the dialog itself changing, but the
            // guard means openCreate() (which would reset editingTask) is
            // never reached — editingTask stays the task being edited.
            expect(component.editingTask()).toEqual(task);
        });

        it('does nothing for an unrecognized key', () => {
            const fixture = createDashboard();
            const component = fixture.componentInstance;

            press('x');

            expect(component.showForm()).toBe(false);
        });
    });

    describe('role-gated computed signals', () => {
        it('canMutate/canViewAudit are both false for a Viewer', () => {
            currentRole = Role.VIEWER;
            const fixture = createDashboard();
            const component = fixture.componentInstance;

            expect(component.canMutate()).toBe(false);
            expect(component.canViewAudit()).toBe(false);
        });

        it('openCreate() is a no-op for a Viewer, who lacks TASK_CREATE', () => {
            currentRole = Role.VIEWER;
            const fixture = createDashboard();
            const component = fixture.componentInstance;

            component.openCreate();

            expect(component.showForm()).toBe(false);
        });
    });
});
