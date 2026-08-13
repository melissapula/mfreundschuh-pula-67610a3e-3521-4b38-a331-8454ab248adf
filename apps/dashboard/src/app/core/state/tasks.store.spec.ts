import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { Task, TaskCategory, TaskStatus } from '@app/data/browser';
import { TasksStore } from './tasks.store';
import { TasksApiService } from '../api/tasks-api.service';

function createTasksStore(api: Partial<TasksApiService>): TasksStore {
    TestBed.configureTestingModule({
        providers: [{ provide: TasksApiService, useValue: api }],
    });
    return TestBed.inject(TasksStore);
}

function makeTask(overrides: Partial<Task>): Task {
    return {
        id: overrides.id ?? 'id',
        title: overrides.title ?? 'Untitled',
        description: '',
        category: overrides.category ?? TaskCategory.WORK,
        status: overrides.status ?? TaskStatus.TODO,
        order: overrides.order ?? 0,
        ownerId: 'owner-1',
        organizationId: 'org-1',
        createdAt: overrides.createdAt ?? '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        ...overrides,
    };
}

describe('TasksStore', () => {
    let api: {
        list: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
        remove: jest.Mock;
    };
    let store: TasksStore;

    const tasks: Task[] = [
        makeTask({
            id: 't1',
            title: 'Zebra task',
            category: TaskCategory.WORK,
            status: TaskStatus.TODO,
            order: 1,
            createdAt: '2026-01-01T00:00:00.000Z',
        }),
        makeTask({
            id: 't2',
            title: 'Alpha task',
            category: TaskCategory.PERSONAL,
            status: TaskStatus.DONE,
            order: 0,
            createdAt: '2026-01-03T00:00:00.000Z',
        }),
        makeTask({
            id: 't3',
            title: 'Middle task',
            category: TaskCategory.WORK,
            status: TaskStatus.IN_PROGRESS,
            order: 0,
            createdAt: '2026-01-02T00:00:00.000Z',
        }),
    ];

    beforeEach(async () => {
        api = {
            list: jest.fn().mockReturnValue(of(tasks)),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
        };
        store = createTasksStore(api as unknown as TasksApiService);
        await store.load();
    });

    it('loads tasks from the API into state', () => {
        expect(store.tasks()).toHaveLength(3);
    });

    it('filters by category', () => {
        store.setCategoryFilter(TaskCategory.PERSONAL);
        expect(store.filteredTasks().map((t) => t.id)).toEqual(['t2']);
    });

    it('filters by status', () => {
        store.setStatusFilter(TaskStatus.DONE);
        expect(store.filteredTasks().map((t) => t.id)).toEqual(['t2']);
    });

    it('filters by search text, case-insensitively', () => {
        store.setSearch('ALPHA');
        expect(store.filteredTasks().map((t) => t.id)).toEqual(['t2']);
    });

    it('sorts by title', () => {
        store.setSortBy('title');
        expect(store.filteredTasks().map((t) => t.id)).toEqual([
            't2',
            't3',
            't1',
        ]); // Alpha, Middle, Zebra
    });

    it('sorts by newest first', () => {
        store.setSortBy('createdAt');
        expect(store.filteredTasks().map((t) => t.id)).toEqual([
            't2',
            't3',
            't1',
        ]);
    });

    it('groups tasks by status for the board columns', () => {
        const grouped = store.byStatus();
        expect(grouped[TaskStatus.TODO].map((t) => t.id)).toEqual(['t1']);
        expect(grouped[TaskStatus.IN_PROGRESS].map((t) => t.id)).toEqual([
            't3',
        ]);
        expect(grouped[TaskStatus.DONE].map((t) => t.id)).toEqual(['t2']);
    });

    it('computes completion stats over ALL tasks, ignoring active filters', () => {
        store.setCategoryFilter(TaskCategory.PERSONAL); // would leave only 1 task in the filtered view
        const stats = store.completionStats();
        expect(stats).toEqual({ total: 3, done: 1, percent: 33 });
    });

    describe('reorderColumn', () => {
        it('persists only the tasks whose order or status actually changed', async () => {
            api.update.mockImplementation((id: string, dto: unknown) =>
                of({ ...tasks.find((t) => t.id === id), ...(dto as object) }),
            );

            // t1 (order 1) and a hypothetical reorder to [t1] at index 0 in TODO
            await store.reorderColumn(TaskStatus.TODO, ['t1']);

            expect(api.update).toHaveBeenCalledWith('t1', {
                order: 0,
                status: TaskStatus.TODO,
            });
            expect(api.update).toHaveBeenCalledTimes(1);
        });

        it('moves a task into a different column, updating its status', async () => {
            api.update.mockImplementation((id: string, dto: unknown) =>
                of({ ...tasks.find((t) => t.id === id), ...(dto as object) }),
            );

            await store.reorderColumn(TaskStatus.DONE, ['t3']);

            expect(api.update).toHaveBeenCalledWith('t3', {
                order: 0,
                status: TaskStatus.DONE,
            });
        });

        it('reverts the optimistic move and surfaces an error when the API call fails', async () => {
            api.update.mockReturnValue(throwError(() => new Error('boom')));

            await store.reorderColumn(TaskStatus.TODO, ['t1']);

            expect(store.tasks().find((t) => t.id === 't1')?.order).toBe(1);
            expect(store.mutationError()).toBe('Could not save the new order.');
        });

        it("only reverts the failing call's own tasks, not a sibling concurrent call's already-applied change (cross-column drag fires two un-awaited calls)", async () => {
            // t3 (IN_PROGRESS, order 0) moves into TODO and fails.
            // t1 (TODO, order 1) moves into IN_PROGRESS and succeeds.
            // Neither call awaits the other, matching dashboard.component.ts's
            // onDrop for a cross-column drop.
            api.update.mockImplementation((id: string, dto: unknown) => {
                if (id === 't3') return throwError(() => new Error('boom'));
                return of({
                    ...tasks.find((t) => t.id === id),
                    ...(dto as object),
                });
            });

            const failing = store.reorderColumn(TaskStatus.TODO, ['t3']);
            const succeeding = store.reorderColumn(TaskStatus.IN_PROGRESS, [
                't1',
            ]);
            await Promise.all([failing, succeeding]);

            const t3 = store.tasks().find((t) => t.id === 't3');
            expect(t3?.status).toBe(TaskStatus.IN_PROGRESS);
            expect(t3?.order).toBe(0);

            const t1 = store.tasks().find((t) => t.id === 't1');
            expect(t1?.status).toBe(TaskStatus.IN_PROGRESS);
            expect(t1?.order).toBe(0);

            expect(store.mutationError()).toBe('Could not save the new order.');
        });

        it('within a single call, reverts only the tasks whose own PATCH failed — not tasks whose PATCH in the same Promise.allSettled batch already succeeded', async () => {
            // All three tasks move into TODO in one call. t2's PATCH fails;
            // t1's and t3's succeed.
            api.update.mockImplementation((id: string, dto: unknown) => {
                if (id === 't2') return throwError(() => new Error('boom'));
                return of({
                    ...tasks.find((t) => t.id === id),
                    ...(dto as object),
                });
            });

            await store.reorderColumn(TaskStatus.TODO, ['t1', 't2', 't3']);

            const t1 = store.tasks().find((t) => t.id === 't1');
            expect(t1?.status).toBe(TaskStatus.TODO);
            expect(t1?.order).toBe(0);

            const t3 = store.tasks().find((t) => t.id === 't3');
            expect(t3?.status).toBe(TaskStatus.TODO);
            expect(t3?.order).toBe(2);

            // t2 is the only one that reverts, back to its pre-drag values.
            const t2 = store.tasks().find((t) => t.id === 't2');
            expect(t2?.status).toBe(TaskStatus.DONE);
            expect(t2?.order).toBe(0);

            expect(store.mutationError()).toBe('Could not save the new order.');
        });

        it('clears a stale mutation error even on a no-op drop (dropped back in the same place)', async () => {
            api.update.mockImplementation((id: string, dto: unknown) =>
                of({ ...tasks.find((t) => t.id === id), ...(dto as object) }),
            );
            await store.reorderColumn(TaskStatus.TODO, ['t1']); // t1 -> order 0, TODO

            api.remove.mockReturnValue(throwError(() => new Error('boom')));
            await expect(store.remove('t2')).rejects.toThrow(); // seeds a stale error
            expect(store.mutationError()).not.toBeNull();

            // Same order/status t1 already has — produces no `changed` entries.
            await store.reorderColumn(TaskStatus.TODO, ['t1']);

            expect(store.mutationError()).toBeNull();
        });
    });

    describe('mutation error handling', () => {
        it('create() surfaces an error and rethrows without adding a task', async () => {
            api.create.mockReturnValue(throwError(() => new Error('boom')));

            await expect(
                store.create({ title: 'x', category: TaskCategory.WORK }),
            ).rejects.toThrow();

            expect(store.tasks()).toHaveLength(3);
            expect(store.mutationError()).toBe('Could not create the task.');
        });

        it('update() surfaces an error and rethrows without changing state', async () => {
            api.update.mockReturnValue(throwError(() => new Error('boom')));

            await expect(
                store.update('t1', { title: 'renamed' }),
            ).rejects.toThrow();

            expect(store.tasks().find((t) => t.id === 't1')?.title).toBe(
                'Zebra task',
            );
            expect(store.mutationError()).toBe('Could not save the task.');
        });

        it('remove() surfaces an error and rethrows without removing the task', async () => {
            api.remove.mockReturnValue(throwError(() => new Error('boom')));

            await expect(store.remove('t1')).rejects.toThrow();

            expect(store.tasks()).toHaveLength(3);
            expect(store.mutationError()).toBe('Could not delete the task.');
        });

        it('a fresh attempt clears a stale error from a previous failure, not just the Dismiss button', async () => {
            api.remove.mockReturnValue(throwError(() => new Error('boom')));
            await expect(store.remove('t1')).rejects.toThrow();
            expect(store.mutationError()).not.toBeNull();

            api.create.mockReturnValue(
                of({ ...tasks[0], id: 'new-id', title: 'New' }),
            );
            await store.create({ title: 'New', category: TaskCategory.WORK });

            expect(store.mutationError()).toBeNull();
        });

        it('load() clears a stale mutation error left over from a prior failed action', async () => {
            api.remove.mockReturnValue(throwError(() => new Error('boom')));
            await expect(store.remove('t1')).rejects.toThrow();
            expect(store.mutationError()).not.toBeNull();

            await store.load();

            expect(store.mutationError()).toBeNull();
        });

        it('clearMutationError() resets the error state', async () => {
            api.remove.mockReturnValue(throwError(() => new Error('boom')));
            await expect(store.remove('t1')).rejects.toThrow();
            expect(store.mutationError()).not.toBeNull();

            store.clearMutationError();

            expect(store.mutationError()).toBeNull();
        });
    });
});
