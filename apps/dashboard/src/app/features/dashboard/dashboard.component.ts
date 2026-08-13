import {
    Component,
    HostListener,
    OnInit,
    ViewChild,
    ElementRef,
    computed,
    inject,
    signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CdkDragDrop, DragDropModule } from '@angular/cdk/drag-drop';
import {
    CreateTaskInput,
    Permission,
    Task,
    TaskCategory,
    TaskStatus,
    UpdateTaskInput,
} from '@app/data/browser';
import { roleHasPermission } from '@app/auth/core';
import { AuthService } from '../../core/auth/auth.service';
import { ThemeService } from '../../core/state/theme.service';
import { TasksStore } from '../../core/state/tasks.store';
import { TaskCardComponent } from './task-card.component';
import { TaskFormDialogComponent } from './task-form-dialog.component';
import { CompletionChartComponent } from './completion-chart.component';

interface Column {
    status: TaskStatus;
    label: string;
}

@Component({
    selector: 'app-dashboard',
    standalone: true,
    imports: [
        RouterLink,
        DragDropModule,
        TaskCardComponent,
        TaskFormDialogComponent,
        CompletionChartComponent,
    ],
    templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnInit {
    @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;

    readonly store = inject(TasksStore);
    readonly auth = inject(AuthService);
    readonly theme = inject(ThemeService);
    private readonly router = inject(Router);

    readonly columns: Column[] = [
        { status: TaskStatus.TODO, label: 'To Do' },
        { status: TaskStatus.IN_PROGRESS, label: 'In Progress' },
        { status: TaskStatus.DONE, label: 'Done' },
    ];
    readonly columnIds = this.columns.map((c) => c.status);
    readonly categories = ['ALL', ...Object.values(TaskCategory)] as const;

    readonly editingTask = signal<Task | null>(null);
    readonly showForm = signal(false);
    /**
     * Scoped to the currently-open dialog, unlike store.mutationError() (a
     * board-wide banner that renders behind the modal backdrop — no good
     * for telling the user *why* the dialog didn't close). Set from
     * store.mutationError() right after a failed save; cleared whenever a
     * dialog opens so a stale error from something unrelated (a failed
     * drag, a failed delete) can't leak into a fresh dialog session.
     */
    readonly formError = signal<string | null>(null);

    readonly canMutate = computed(() => {
        const role = this.auth.role();
        return role !== null && roleHasPermission(role, Permission.TASK_CREATE);
    });
    readonly canViewAudit = computed(() => {
        const role = this.auth.role();
        return role !== null && roleHasPermission(role, Permission.AUDIT_READ);
    });

    ngOnInit(): void {
        this.store.load();
    }

    openCreate(): void {
        if (!this.canMutate()) return;
        this.editingTask.set(null);
        this.formError.set(null);
        this.showForm.set(true);
    }

    openEdit(task: Task): void {
        this.editingTask.set(task);
        this.formError.set(null);
        this.showForm.set(true);
    }

    closeForm(): void {
        this.showForm.set(false);
        this.formError.set(null);
    }

    async saveTask(dto: CreateTaskInput | UpdateTaskInput): Promise<void> {
        const editing = this.editingTask();
        try {
            if (editing) {
                await this.store.update(editing.id, dto as UpdateTaskInput);
            } else {
                await this.store.create(dto as CreateTaskInput);
            }
            this.showForm.set(false);
            this.formError.set(null);
        } catch {
            // Leave the dialog open so the user's input isn't lost, and
            // surface why right inside it — store.mutationError() alone
            // renders behind the modal backdrop, invisible while it's open.
            this.formError.set(this.store.mutationError());
        }
    }

    async deleteTask(task: Task): Promise<void> {
        // TaskCardComponent already gates this behind its own two-click confirm.
        try {
            await this.store.remove(task.id);
        } catch {
            // Surfaced via store.mutationError().
        }
    }

    onDrop(event: CdkDragDrop<Task[]>, targetStatus: TaskStatus): void {
        if (!this.canMutate()) return;

        const sourceStatus = event.previousContainer.id as TaskStatus;
        const sourceTasks = [...event.previousContainer.data];

        if (event.previousContainer === event.container) {
            const [moved] = sourceTasks.splice(event.previousIndex, 1);
            sourceTasks.splice(event.currentIndex, 0, moved);
            this.store.reorderColumn(
                targetStatus,
                sourceTasks.map((t) => t.id),
            );
        } else {
            const destTasks = [...event.container.data];
            const [moved] = sourceTasks.splice(event.previousIndex, 1);
            destTasks.splice(event.currentIndex, 0, moved);
            this.store.reorderColumn(
                sourceStatus,
                sourceTasks.map((t) => t.id),
            );
            this.store.reorderColumn(
                targetStatus,
                destTasks.map((t) => t.id),
            );
        }
    }

    logout(): void {
        this.auth.logout();
        this.router.navigateByUrl('/login');
    }

    @HostListener('document:keydown', ['$event'])
    onKeydown(event: KeyboardEvent): void {
        const target = event.target as HTMLElement;
        const typing =
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        if (typing || this.showForm()) return;

        if (event.key === 'n') {
            event.preventDefault();
            this.openCreate();
        } else if (event.key === '/') {
            event.preventDefault();
            this.searchInput?.nativeElement.focus();
        }
    }
}
