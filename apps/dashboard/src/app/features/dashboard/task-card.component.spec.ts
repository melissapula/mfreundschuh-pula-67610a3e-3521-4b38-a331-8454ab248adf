import { TestBed } from '@angular/core/testing';
import { Task, TaskCategory, TaskStatus } from '@app/data/browser';
import { TaskCardComponent } from './task-card.component';

const task: Task = {
    id: 't1',
    title: 'Write tests',
    description: '',
    category: TaskCategory.WORK,
    status: TaskStatus.TODO,
    order: 0,
    ownerId: 'owner-1',
    organizationId: 'org-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('TaskCardComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TaskCardComponent],
        }).compileComponents();
    });

    function createCard() {
        const fixture = TestBed.createComponent(TaskCardComponent);
        fixture.componentRef.setInput('task', task);
        fixture.componentRef.setInput('canMutate', true);
        fixture.detectChanges();
        return fixture;
    }

    it('requires a second click within the revert window to emit remove', () => {
        jest.useFakeTimers();
        const fixture = createCard();
        const removed = jest.fn();
        fixture.componentInstance.remove.subscribe(removed);

        fixture.componentInstance.onDeleteClick();
        expect(fixture.componentInstance.confirmingDelete()).toBe(true);
        expect(removed).not.toHaveBeenCalled();

        fixture.componentInstance.onDeleteClick();
        expect(removed).toHaveBeenCalledWith(task);

        jest.useRealTimers();
    });

    it('reverts the confirm state on its own after the timeout elapses', () => {
        jest.useFakeTimers();
        const fixture = createCard();

        fixture.componentInstance.onDeleteClick();
        expect(fixture.componentInstance.confirmingDelete()).toBe(true);

        jest.advanceTimersByTime(3000);
        expect(fixture.componentInstance.confirmingDelete()).toBe(false);

        jest.useRealTimers();
    });

    it('clears the pending revert timer on destroy so it cannot fire after the component is gone', () => {
        jest.useFakeTimers();
        const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
        const fixture = createCard();

        fixture.componentInstance.onDeleteClick();
        fixture.destroy();

        expect(clearTimeoutSpy).toHaveBeenCalled();

        clearTimeoutSpy.mockRestore();
        jest.useRealTimers();
    });
});
