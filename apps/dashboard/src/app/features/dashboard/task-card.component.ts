import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { DragDropModule } from '@angular/cdk/drag-drop';
import { Task } from '@app/data/browser';

@Component({
  selector: 'app-task-card',
  standalone: true,
  imports: [DragDropModule, NgClass],
  templateUrl: './task-card.component.html',
})
export class TaskCardComponent {
  @Input({ required: true }) task!: Task;
  @Input() canMutate = false;
  @Output() edit = new EventEmitter<Task>();
  @Output() remove = new EventEmitter<Task>();

  readonly categoryClasses: Record<string, string> = {
    WORK: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200',
    PERSONAL:
      'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-200',
    OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200',
  };

  /**
   * In-app two-click confirm instead of window.confirm() — native dialogs
   * block the whole tab (including any automation driving it) and can't be
   * themed. A second click within a few seconds confirms; otherwise it
   * reverts on its own.
   */
  readonly confirmingDelete = signal(false);
  private revertTimer?: ReturnType<typeof setTimeout>;

  onDeleteClick(): void {
    if (!this.confirmingDelete()) {
      this.confirmingDelete.set(true);
      this.revertTimer = setTimeout(
        () => this.confirmingDelete.set(false),
        3000,
      );
      return;
    }
    clearTimeout(this.revertTimer);
    this.confirmingDelete.set(false);
    this.remove.emit(this.task);
  }
}
