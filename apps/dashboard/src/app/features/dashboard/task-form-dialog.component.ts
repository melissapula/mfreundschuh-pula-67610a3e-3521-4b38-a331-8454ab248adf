import {
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    inject,
} from '@angular/core';
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
    imports: [ReactiveFormsModule],
    templateUrl: './task-form-dialog.component.html',
})
export class TaskFormDialogComponent implements OnChanges {
    private readonly fb = inject(FormBuilder);

    @Input() task: Task | null = null;
    @Output() save = new EventEmitter<CreateTaskInput | UpdateTaskInput>();
    @Output() close = new EventEmitter<void>();

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

    get isEditing(): boolean {
        return this.task !== null;
    }

    submit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }
        this.save.emit(this.form.getRawValue());
    }
}
