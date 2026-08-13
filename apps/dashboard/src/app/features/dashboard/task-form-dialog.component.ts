import {
    Component,
    EventEmitter,
    HostListener,
    Input,
    OnChanges,
    OnDestroy,
    Output,
    inject,
    signal,
} from '@angular/core';
import { A11yModule } from '@angular/cdk/a11y';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import {
    CreateTaskInput,
    Task,
    TaskCategory,
    TaskStatus,
    UpdateTaskInput,
} from '@app/data/browser';

@Component({
    selector: 'app-task-form-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, A11yModule],
    templateUrl: './task-form-dialog.component.html',
})
export class TaskFormDialogComponent implements OnChanges, OnDestroy {
    private readonly fb = inject(FormBuilder);

    @Input() task: Task | null = null;
    /** A failed save from the parent, shown inline — the board-level error
     * banner renders behind this dialog's backdrop and would otherwise be
     * invisible while it's open. */
    @Input() error: string | null = null;
    @Output() save = new EventEmitter<CreateTaskInput | UpdateTaskInput>();
    @Output() closed = new EventEmitter<void>();

    /** Briefly true to play a CSS shake when a dismiss is blocked by unsaved
     * changes, so pressing Escape on a dirty form isn't silently ignored. */
    readonly blockedDismiss = signal(false);
    private blockedDismissTimer?: ReturnType<typeof setTimeout>;

    readonly categories = Object.values(TaskCategory);
    readonly statuses = Object.values(TaskStatus);

    readonly form = this.fb.nonNullable.group({
        title: ['', [Validators.required, Validators.maxLength(200)]],
        description: [''],
        category: [TaskCategory.WORK, Validators.required],
        status: [TaskStatus.TODO, Validators.required],
    });

    ngOnChanges(): void {
        this.form.reset({
            title: this.task?.title ?? '',
            description: this.task?.description ?? '',
            category: this.task?.category ?? TaskCategory.WORK,
            status: this.task?.status ?? TaskStatus.TODO,
        });
    }

    /**
     * Escape and backdrop-click are the "accidental dismiss" paths — an IME
     * composing keystroke, a reflexive Escape, a misclick outside the panel.
     * Both route through here and no-op while the form has unsaved changes;
     * Cancel stays a direct `closed.emit()` since it's a deliberate action
     * that should always work, dirty or not.
     */
    requestDismiss(): void {
        if (this.form.dirty) {
            clearTimeout(this.blockedDismissTimer);
            this.blockedDismiss.set(true);
            this.blockedDismissTimer = setTimeout(
                () => this.blockedDismiss.set(false),
                400,
            );
            return;
        }
        this.closed.emit();
    }

    @HostListener('document:keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        if (event.key !== 'Escape' || event.isComposing) return;
        // A native <select> handles its own Escape (closes the dropdown,
        // doesn't reach here in most browsers) — bail defensively so a
        // browser where it does bubble can't discard the whole form instead.
        if (document.activeElement instanceof HTMLSelectElement) return;
        this.requestDismiss();
    }

    get isEditing(): boolean {
        return this.task !== null;
    }

    ngOnDestroy(): void {
        clearTimeout(this.blockedDismissTimer);
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.save.emit(this.form.getRawValue());
    }
}
