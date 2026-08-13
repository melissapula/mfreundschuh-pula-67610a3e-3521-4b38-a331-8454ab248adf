import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { AuditAction, AuthUser, Role, TaskCategory } from '@app/data';
import { TasksService } from './tasks.service';
import { TaskEntity } from '../entities';
import { AuditService } from '../audit/audit.service';
import { OrgScopeService } from '../organizations/org-scope.service';

describe('TasksService', () => {
    const admin: AuthUser = {
        sub: 'admin-1',
        email: 'admin@acme.test',
        role: Role.ADMIN,
        organizationId: 'acme',
    };

    let tasksRepo: {
        create: jest.Mock;
        save: jest.Mock;
        findOne: jest.Mock;
        remove: jest.Mock;
        createQueryBuilder: jest.Mock;
    };
    let orgScope: { accessibleOrgIds: jest.Mock };
    let audit: { log: jest.Mock };
    let service: TasksService;

    beforeEach(() => {
        tasksRepo = {
            create: jest.fn((x) => x),
            save: jest.fn(async (x) => ({ id: 'task-1', ...x })),
            findOne: jest.fn(),
            remove: jest.fn(async (x) => x),
            createQueryBuilder: jest.fn(),
        };
        orgScope = { accessibleOrgIds: jest.fn() };
        audit = { log: jest.fn().mockResolvedValue(undefined) };

        service = new TasksService(
            tasksRepo as unknown as Repository<TaskEntity>,
            orgScope as unknown as OrgScopeService,
            audit as unknown as AuditService,
        );
    });

    describe('create', () => {
        it('sets ownerId and organizationId from the actor, never from the client-supplied DTO', async () => {
            const dto = { title: 'New task', category: TaskCategory.WORK };

            const result = await service.create(admin, dto);

            expect(tasksRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    ownerId: 'admin-1',
                    organizationId: 'acme',
                }),
            );
            expect(result.organizationId).toBe('acme');
        });

        it('logs a TASK_CREATE audit entry', async () => {
            await service.create(admin, {
                title: 'New task',
                category: TaskCategory.WORK,
            });

            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: AuditAction.TASK_CREATE,
                    actorUserId: 'admin-1',
                }),
            );
        });
    });

    describe('findAllForUser', () => {
        it("queries only within the actor's accessible org ids", async () => {
            orgScope.accessibleOrgIds.mockResolvedValue(['acme', 'acme-eng']);
            const qb = {
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                getMany: jest
                    .fn()
                    .mockResolvedValue([{ id: 't1' }, { id: 't2' }]),
            };
            tasksRepo.createQueryBuilder.mockReturnValue(qb);

            const result = await service.findAllForUser(admin);

            expect(qb.where).toHaveBeenCalledWith(
                'task.organizationId IN (:...orgIds)',
                {
                    orgIds: ['acme', 'acme-eng'],
                },
            );
            expect(result).toHaveLength(2);
        });

        it('returns an empty list without querying when the actor has no accessible orgs', async () => {
            orgScope.accessibleOrgIds.mockResolvedValue([]);

            const result = await service.findAllForUser(admin);

            expect(result).toEqual([]);
            expect(tasksRepo.createQueryBuilder).not.toHaveBeenCalled();
        });

        it('logs a TASK_READ_LIST audit entry with the result count', async () => {
            orgScope.accessibleOrgIds.mockResolvedValue([]);

            await service.findAllForUser(admin);

            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: AuditAction.TASK_READ_LIST,
                    metadata: { count: 0 },
                }),
            );
        });
    });

    describe('update', () => {
        it("updates a task within the actor's org scope", async () => {
            tasksRepo.findOne.mockResolvedValue({
                id: 'task-1',
                organizationId: 'acme',
                title: 'Old',
            });
            orgScope.accessibleOrgIds.mockResolvedValue(['acme']);

            const result = await service.update(admin, 'task-1', {
                title: 'New title',
            });

            expect(result.title).toBe('New title');
            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: AuditAction.TASK_UPDATE }),
            );
        });

        it('throws NotFoundException when the task does not exist', async () => {
            tasksRepo.findOne.mockResolvedValue(null);

            await expect(
                service.update(admin, 'missing', { title: 'x' }),
            ).rejects.toThrow(NotFoundException);
        });

        it("throws NotFoundException (not Forbidden) when the task exists but is outside the actor's org scope, and logs ACCESS_DENIED", async () => {
            tasksRepo.findOne.mockResolvedValue({
                id: 'task-1',
                organizationId: 'other-org',
                title: 'Old',
            });
            orgScope.accessibleOrgIds.mockResolvedValue(['acme']); // does not include 'other-org'

            await expect(
                service.update(admin, 'task-1', { title: 'New title' }),
            ).rejects.toThrow(NotFoundException);
            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: AuditAction.ACCESS_DENIED,
                    resourceId: 'task-1',
                }),
            );
            expect(tasksRepo.save).not.toHaveBeenCalled();
        });
    });

    describe('remove', () => {
        it("removes a task within the actor's org scope and logs TASK_DELETE", async () => {
            tasksRepo.findOne.mockResolvedValue({
                id: 'task-1',
                organizationId: 'acme',
            });
            orgScope.accessibleOrgIds.mockResolvedValue(['acme']);

            await service.remove(admin, 'task-1');

            expect(tasksRepo.remove).toHaveBeenCalled();
            expect(audit.log).toHaveBeenCalledWith(
                expect.objectContaining({ action: AuditAction.TASK_DELETE }),
            );
        });

        it("refuses to delete a task outside the actor's org scope", async () => {
            tasksRepo.findOne.mockResolvedValue({
                id: 'task-1',
                organizationId: 'other-org',
            });
            orgScope.accessibleOrgIds.mockResolvedValue(['acme']);

            await expect(service.remove(admin, 'task-1')).rejects.toThrow(
                NotFoundException,
            );
            expect(tasksRepo.remove).not.toHaveBeenCalled();
        });
    });
});
