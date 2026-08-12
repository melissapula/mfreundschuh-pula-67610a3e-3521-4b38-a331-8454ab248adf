import { TaskCategory, TaskStatus } from '../enums/task.enum';

export interface Task {
  id: string;
  title: string;
  description: string;
  category: TaskCategory;
  status: TaskStatus;
  /** Position for drag-and-drop ordering within a status column. */
  order: number;
  ownerId: string;
  /** Set from the owner's org at creation time; immutable afterward. */
  organizationId: string;
  createdAt: string;
  updatedAt: string;
}
