import { of } from 'rxjs';
import { Task, TaskCategory, TaskStatus } from '@app/data/browser';
import { TasksStore } from './tasks.store';
import { TasksApiService } from '../api/tasks-api.service';

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
    store = new TasksStore(api as unknown as TasksApiService);
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
    expect(store.filteredTasks().map((t) => t.id)).toEqual(['t2', 't3', 't1']); // Alpha, Middle, Zebra
  });

  it('sorts by newest first', () => {
    store.setSortBy('createdAt');
    expect(store.filteredTasks().map((t) => t.id)).toEqual(['t2', 't3', 't1']);
  });

  it('groups tasks by status for the board columns', () => {
    const grouped = store.byStatus();
    expect(grouped[TaskStatus.TODO].map((t) => t.id)).toEqual(['t1']);
    expect(grouped[TaskStatus.IN_PROGRESS].map((t) => t.id)).toEqual(['t3']);
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
  });
});
