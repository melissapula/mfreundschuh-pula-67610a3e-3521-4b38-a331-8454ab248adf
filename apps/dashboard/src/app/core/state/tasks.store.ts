import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
    CreateTaskInput,
    Task,
    TaskCategory,
    TaskStatus,
    UpdateTaskInput,
} from '@app/data/browser';
import { TasksApiService } from '../api/tasks-api.service';

export type CategoryFilter = TaskCategory | 'ALL';
export type StatusFilter = TaskStatus | 'ALL';
export type SortBy = 'order' | 'title' | 'createdAt';

/**
 * Signals-based store: a single injectable holding the task list and view
 * state (filter/sort), with computed views derived from it. Chosen over
 * NgRx for an app this size — the ceremony of actions/reducers/effects
 * wouldn't buy us anything a plain signal + computed() doesn't already give.
 */
@Injectable({ providedIn: 'root' })
export class TasksStore {
    private readonly api = inject(TasksApiService);
    private readonly _tasks = signal<Task[]>([]);
    private readonly _loading = signal(false);
    private readonly _error = signal<string | null>(null);
    /**
     * Separate from `_error`: `_error` gates the whole board (load failed,
     * nothing to show). A failed create/update/remove/reorder shouldn't hide
     * tasks that already loaded fine — it surfaces as a dismissible banner
     * instead.
     */
    private readonly _mutationError = signal<string | null>(null);
    private readonly _categoryFilter = signal<CategoryFilter>('ALL');
    private readonly _statusFilter = signal<StatusFilter>('ALL');
    private readonly _sortBy = signal<SortBy>('order');
    private readonly _search = signal('');

    readonly tasks = this._tasks.asReadonly();
    readonly loading = this._loading.asReadonly();
    readonly error = this._error.asReadonly();
    readonly mutationError = this._mutationError.asReadonly();
    readonly categoryFilter = this._categoryFilter.asReadonly();
    readonly statusFilter = this._statusFilter.asReadonly();
    readonly sortBy = this._sortBy.asReadonly();
    readonly search = this._search.asReadonly();

    readonly filteredTasks = computed(() => {
        const category = this._categoryFilter();
        const status = this._statusFilter();
        const search = this._search().trim().toLowerCase();
        const sortBy = this._sortBy();

        let list = this._tasks();
        if (category !== 'ALL')
            list = list.filter((t) => t.category === category);
        if (status !== 'ALL') list = list.filter((t) => t.status === status);
        if (search)
            list = list.filter((t) => t.title.toLowerCase().includes(search));

        return [...list].sort((a, b) => {
            if (sortBy === 'title') return a.title.localeCompare(b.title);
            if (sortBy === 'createdAt')
                return (
                    new Date(b.createdAt).getTime() -
                    new Date(a.createdAt).getTime()
                );
            return a.order - b.order;
        });
    });

    readonly byStatus = computed<Record<TaskStatus, Task[]>>(() => {
        const list = this.filteredTasks();
        return {
            [TaskStatus.TODO]: list.filter((t) => t.status === TaskStatus.TODO),
            [TaskStatus.IN_PROGRESS]: list.filter(
                (t) => t.status === TaskStatus.IN_PROGRESS,
            ),
            [TaskStatus.DONE]: list.filter((t) => t.status === TaskStatus.DONE),
        };
    });

    /** Deliberately computed over ALL tasks (not the filtered view) — completion is a global fact, not a view of the moment. */
    readonly completionStats = computed(() => {
        const list = this._tasks();
        const total = list.length;
        const done = list.filter((t) => t.status === TaskStatus.DONE).length;
        return {
            total,
            done,
            percent: total ? Math.round((done / total) * 100) : 0,
        };
    });

    setCategoryFilter(value: CategoryFilter): void {
        this._categoryFilter.set(value);
    }

    setStatusFilter(value: StatusFilter): void {
        this._statusFilter.set(value);
    }

    setSortBy(value: SortBy): void {
        this._sortBy.set(value);
    }

    setSearch(value: string): void {
        this._search.set(value);
    }

    async load(): Promise<void> {
        this._loading.set(true);
        this._error.set(null);
        this._mutationError.set(null);
        try {
            const tasks = await firstValueFrom(this.api.list());
            this._tasks.set(tasks);
        } catch {
            this._error.set('Could not load tasks.');
        } finally {
            this._loading.set(false);
        }
    }

    clearMutationError(): void {
        this._mutationError.set(null);
    }

    async create(dto: CreateTaskInput): Promise<void> {
        this._mutationError.set(null);
        try {
            const task = await firstValueFrom(this.api.create(dto));
            this._tasks.update((tasks) => [...tasks, task]);
        } catch (err) {
            this._mutationError.set('Could not create the task.');
            throw err;
        }
    }

    async update(id: string, dto: UpdateTaskInput): Promise<void> {
        this._mutationError.set(null);
        try {
            const updated = await firstValueFrom(this.api.update(id, dto));
            this._tasks.update((tasks) =>
                tasks.map((t) => (t.id === id ? updated : t)),
            );
        } catch (err) {
            this._mutationError.set('Could not save the task.');
            throw err;
        }
    }

    async remove(id: string): Promise<void> {
        this._mutationError.set(null);
        try {
            await firstValueFrom(this.api.remove(id));
            this._tasks.update((tasks) => tasks.filter((t) => t.id !== id));
        } catch (err) {
            this._mutationError.set('Could not delete the task.');
            throw err;
        }
    }

    /**
     * Applied after a drag-and-drop drop: orderedTaskIds is the new full
     * ordering for one status column. Persists both the reindexed `order`
     * and (for a cross-column drop) the new `status` for whichever tasks
     * actually changed — covers both reordering and status-change-by-drag
     * with one code path.
     *
     * A cross-column drag calls this twice (once per column) without
     * awaiting either — so on failure we revert only the specific tasks
     * *this* call touched, back to their own pre-drag values, rather than
     * restoring a whole-array snapshot. A snapshot taken at the start of
     * one call can already include the other call's optimistic update (or
     * miss its later success), so restoring it wholesale would stomp on a
     * sibling call's change that actually persisted fine.
     */
    async reorderColumn(
        status: TaskStatus,
        orderedTaskIds: string[],
    ): Promise<void> {
        const current = this._tasks();
        const changed: Array<{
            id: string;
            dto: UpdateTaskInput;
            previous: UpdateTaskInput;
        }> = [];

        orderedTaskIds.forEach((id, index) => {
            const task = current.find((t) => t.id === id);
            if (task && (task.order !== index || task.status !== status)) {
                changed.push({
                    id,
                    dto: { order: index, status },
                    previous: { order: task.order, status: task.status },
                });
            }
        });
        if (!changed.length) return;

        this._mutationError.set(null);

        // Optimistic local update so the drag feels instant; API calls follow.
        this._tasks.update((tasks) =>
            tasks.map((t) => {
                const change = changed.find((c) => c.id === t.id);
                return change ? { ...t, ...change.dto } : t;
            }),
        );

        try {
            await Promise.all(
                changed.map(({ id, dto }) =>
                    firstValueFrom(this.api.update(id, dto)),
                ),
            );
        } catch {
            // Revert only the tasks this call touched, back to their own
            // pre-drag values — see the doc comment above for why not a
            // full snapshot restore.
            this._tasks.update((tasks) =>
                tasks.map((t) => {
                    const change = changed.find((c) => c.id === t.id);
                    return change ? { ...t, ...change.previous } : t;
                }),
            );
            this._mutationError.set('Could not save the new order.');
        }
    }
}
