import { TaskCategory, TaskStatus } from '../enums/task.enum';

/**
 * Plain-interface mirrors of CreateTaskDto/UpdateTaskDto for the frontend.
 * The class-validator-decorated DTOs are for apps/api's ValidationPipe
 * (which needs real classes, not interfaces, to validate against) — the
 * frontend only ever needs the request-body shape, and importing the
 * decorated classes would pull class-validator into the browser bundle.
 */
export interface CreateTaskInput {
    title: string;
    description?: string;
    category: TaskCategory;
    status?: TaskStatus;
    order?: number;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    category?: TaskCategory;
    status?: TaskStatus;
    order?: number;
}
