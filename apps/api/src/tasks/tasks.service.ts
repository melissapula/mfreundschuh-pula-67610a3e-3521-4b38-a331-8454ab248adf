import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
    AuditAction,
    AuthUser,
    CreateTaskDto,
    TaskStatus,
    UpdateTaskDto,
} from '@app/data';
import { TaskEntity } from '../entities';
import { AuditService } from '../audit/audit.service';
import { OrgScopeService } from '../organizations/org-scope.service';

@Injectable()
export class TasksService {
    constructor(
        @InjectRepository(TaskEntity)
        private readonly tasks: Repository<TaskEntity>,
        private readonly orgScope: OrgScopeService,
        private readonly audit: AuditService,
    ) {}

    async create(user: AuthUser, dto: CreateTaskDto): Promise<TaskEntity> {
        const status = dto.status ?? TaskStatus.TODO;
        const order = dto.order ?? (await this.nextOrder(user, status));

        const task = this.tasks.create({
            title: dto.title,
            description: dto.description ?? '',
            category: dto.category,
            status,
            order,
            ownerId: user.sub,
            // Set from the actor's own org, never client-supplied — this is what
            // makes org scoping trustworthy (a task can't be created "into"
            // another org just by an attacker guessing an organizationId).
            organizationId: user.organizationId,
        });
        const saved = await this.tasks.save(task);

        await this.audit.log({
            actorUserId: user.sub,
            actorEmail: user.email,
            action: AuditAction.TASK_CREATE,
            resourceType: 'task',
            resourceId: saved.id,
            organizationId: saved.organizationId,
        });

        return saved;
    }

    async findAllForUser(user: AuthUser): Promise<TaskEntity[]> {
        const orgIds = await this.orgScope.accessibleOrgIds(user);
        const tasks = orgIds.length
            ? await this.tasks
                  .createQueryBuilder('task')
                  .where('task.organizationId IN (:...orgIds)', { orgIds })
                  .orderBy('task.order', 'ASC')
                  .getMany()
            : [];

        await this.audit.log({
            actorUserId: user.sub,
            actorEmail: user.email,
            action: AuditAction.TASK_READ_LIST,
            resourceType: 'task',
            resourceId: null,
            organizationId: user.organizationId,
            metadata: { count: tasks.length },
        });

        return tasks;
    }

    async update(
        user: AuthUser,
        id: string,
        dto: UpdateTaskDto,
    ): Promise<TaskEntity> {
        const task = await this.findAccessibleOrThrow(user, id);
        Object.assign(task, dto);
        const saved = await this.tasks.save(task);

        await this.audit.log({
            actorUserId: user.sub,
            actorEmail: user.email,
            action: AuditAction.TASK_UPDATE,
            resourceType: 'task',
            resourceId: saved.id,
            organizationId: saved.organizationId,
            metadata: { fields: Object.keys(dto) },
        });

        return saved;
    }

    async remove(user: AuthUser, id: string): Promise<void> {
        const task = await this.findAccessibleOrThrow(user, id);
        await this.tasks.remove(task);

        await this.audit.log({
            actorUserId: user.sub,
            actorEmail: user.email,
            action: AuditAction.TASK_DELETE,
            resourceType: 'task',
            resourceId: id,
            organizationId: task.organizationId,
        });
    }

    /**
     * Appends to the bottom of a status column: one past the highest `order`
     * among the tasks in that status the actor can see, scoped by their
     * accessible orgs — same as `findAllForUser` — not just their own org,
     * so an Admin/Owner's "column" can span sub-orgs. Not a strict
     * equivalent of the frontend's column concept, which additionally
     * narrows by whatever category/search filter happens to be active; this
     * only needs to avoid colliding with 0, not reproduce the exact visible
     * ordering.
     *
     * Not transactional: two near-simultaneous creates in the same column
     * can both read the same MAX and land on the same order. Harmless at
     * this app's scale — worst case two cards tie and get resolved by
     * insertion order until the next drag reindexes the column.
     */
    private async nextOrder(
        user: AuthUser,
        status: TaskStatus,
    ): Promise<number> {
        const orgIds = await this.orgScope.accessibleOrgIds(user);
        if (!orgIds.length) return 0;

        const row = await this.tasks
            .createQueryBuilder('task')
            .select('MAX(task.order)', 'max')
            .where('task.organizationId IN (:...orgIds)', { orgIds })
            .andWhere('task.status = :status', { status })
            .getRawOne<{ max: number | null }>();

        return (row?.max ?? -1) + 1;
    }

    /**
     * Fetches a task and enforces org scope in one place, since PermissionsGuard
     * only knows the role/permission at the route level — it can't know which
     * org a specific :id belongs to until we look it up.
     *
     * Returns 404 for both "doesn't exist" and "exists but outside your org
     * scope" (rather than 403 for the latter) so a response code can't be used
     * to enumerate task IDs that belong to other organizations.
     */
    private async findAccessibleOrThrow(
        user: AuthUser,
        id: string,
    ): Promise<TaskEntity> {
        const task = await this.tasks.findOne({ where: { id } });
        if (!task) {
            throw new NotFoundException('Task not found');
        }

        const orgIds = await this.orgScope.accessibleOrgIds(user);
        if (!orgIds.includes(task.organizationId)) {
            await this.audit.log({
                actorUserId: user.sub,
                actorEmail: user.email,
                action: AuditAction.ACCESS_DENIED,
                resourceType: 'task',
                resourceId: id,
                organizationId: user.organizationId,
                metadata: {
                    reason: 'task outside actor org scope',
                    taskOrgId: task.organizationId,
                },
            });
            throw new NotFoundException('Task not found');
        }

        return task;
    }
}
