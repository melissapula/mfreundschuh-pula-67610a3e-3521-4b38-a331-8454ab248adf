import { TestBed } from '@angular/core/testing';
import { TaskCategory, TaskStatus } from '@app/data/browser';
import { TaskFormDialogComponent } from './task-form-dialog.component';

function dispatchEscape(options: Partial<KeyboardEventInit> = {}): void {
    document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', ...options }),
    );
}

describe('TaskFormDialogComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [TaskFormDialogComponent],
        }).compileComponents();
    });

    function createDialog() {
        const fixture = TestBed.createComponent(TaskFormDialogComponent);
        fixture.componentRef.setInput('task', null);
        fixture.detectChanges();
        return fixture;
    }

    describe('requestDismiss', () => {
        it('emits closed when the form has no unsaved changes', () => {
            const fixture = createDialog();
            const closed = jest.fn();
            fixture.componentInstance.closed.subscribe(closed);

            fixture.componentInstance.requestDismiss();

            expect(closed).toHaveBeenCalled();
        });

        it('does not emit closed while the form is dirty, so a stray dismiss cannot discard input', () => {
            const fixture = createDialog();
            const closed = jest.fn();
            fixture.componentInstance.closed.subscribe(closed);
            fixture.componentInstance.form.controls.title.setValue('Draft', {
                emitEvent: true,
            });
            fixture.componentInstance.form.markAsDirty();

            fixture.componentInstance.requestDismiss();

            expect(closed).not.toHaveBeenCalled();
        });
    });

    describe('Escape key handling', () => {
        it('dismisses a pristine dialog on a plain Escape press', () => {
            const fixture = createDialog();
            const closed = jest.fn();
            fixture.componentInstance.closed.subscribe(closed);

            dispatchEscape();

            expect(closed).toHaveBeenCalled();
        });

        it('ignores Escape while an IME composition is in progress', () => {
            const fixture = createDialog();
            const closed = jest.fn();
            fixture.componentInstance.closed.subscribe(closed);

            dispatchEscape({ isComposing: true });

            expect(closed).not.toHaveBeenCalled();
        });

        it('ignores Escape while focus is inside a native <select>, leaving the dropdown to handle it', () => {
            const fixture = createDialog();
            const closed = jest.fn();
            fixture.componentInstance.closed.subscribe(closed);
            const select = fixture.nativeElement.querySelector('select');
            select.focus();
            expect(document.activeElement).toBe(select);

            dispatchEscape();

            expect(closed).not.toHaveBeenCalled();
        });

        it('does not dismiss a dirty form on Escape', () => {
            const fixture = createDialog();
            const closed = jest.fn();
            fixture.componentInstance.closed.subscribe(closed);
            fixture.componentInstance.form.markAsDirty();

            dispatchEscape();

            expect(closed).not.toHaveBeenCalled();
        });
    });

    describe('form lifecycle', () => {
        it('resets to blank defaults when opened with no task (create mode)', () => {
            const fixture = createDialog();

            expect(fixture.componentInstance.isEditing).toBe(false);
            expect(fixture.componentInstance.form.value).toEqual({
                title: '',
                description: '',
                category: TaskCategory.WORK,
                status: TaskStatus.TODO,
            });
        });

        it('populates the form from the task when opened for editing', () => {
            const fixture = createDialog();
            fixture.componentRef.setInput('task', {
                id: 't1',
                title: 'Existing',
                description: 'Desc',
                category: TaskCategory.PERSONAL,
                status: TaskStatus.IN_PROGRESS,
                order: 0,
                ownerId: 'owner-1',
                organizationId: 'org-1',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            });
            fixture.detectChanges();

            expect(fixture.componentInstance.isEditing).toBe(true);
            expect(fixture.componentInstance.form.value.title).toBe('Existing');
        });

        it('does not emit save when the form is invalid, and marks fields touched', () => {
            const fixture = createDialog();
            const save = jest.fn();
            fixture.componentInstance.save.subscribe(save);

            fixture.componentInstance.submit();

            expect(save).not.toHaveBeenCalled();
            expect(fixture.componentInstance.form.controls.title.touched).toBe(
                true,
            );
        });

        it('emits save with the form value when valid', () => {
            const fixture = createDialog();
            const save = jest.fn();
            fixture.componentInstance.save.subscribe(save);
            fixture.componentInstance.form.controls.title.setValue('New task');

            fixture.componentInstance.submit();

            expect(save).toHaveBeenCalledWith(
                expect.objectContaining({ title: 'New task' }),
            );
        });
    });

    describe('accessibility', () => {
        it('labels the dialog panel via aria-labelledby pointing at the visible heading', () => {
            const fixture = createDialog();

            const panel =
                fixture.nativeElement.querySelector('[role="dialog"]');
            const labelledBy = panel.getAttribute('aria-labelledby');
            expect(labelledBy).toBeTruthy();
            const heading = fixture.nativeElement.querySelector(
                `#${labelledBy}`,
            );
            expect(heading?.textContent).toContain('New task');
        });
    });
});
