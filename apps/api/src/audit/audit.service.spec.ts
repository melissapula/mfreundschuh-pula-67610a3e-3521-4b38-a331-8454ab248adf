import { Repository } from 'typeorm';
import { AuditAction } from '@app/data';
import { AuditService } from './audit.service';
import { AuditLogEntity } from '../entities';

describe('AuditService', () => {
    describe('log', () => {
        it('creates and persists an entry with the given fields', async () => {
            const create = jest.fn((x) => x);
            const save = jest.fn().mockResolvedValue(undefined);
            const repo = {
                create,
                save,
            } as unknown as Repository<AuditLogEntity>;
            const service = new AuditService(repo);

            await service.log({
                actorUserId: 'u1',
                actorEmail: 'admin@acme.test',
                action: AuditAction.TASK_CREATE,
                resourceType: 'task',
                resourceId: 't1',
                organizationId: 'acme',
            });

            expect(create).toHaveBeenCalledWith(
                expect.objectContaining({
                    action: AuditAction.TASK_CREATE,
                    metadata: null,
                }),
            );
            expect(save).toHaveBeenCalled();
        });

        it('persists explicit metadata as-is, and logs "(unknown)"/"-" fallbacks for a falsy actor/resource/org (e.g. a login attempt against an unrecognized email)', async () => {
            const create = jest.fn((x) => x);
            const save = jest.fn().mockResolvedValue(undefined);
            const repo = {
                create,
                save,
            } as unknown as Repository<AuditLogEntity>;
            const service = new AuditService(repo);
            const loggerSpy = jest
                .spyOn(service['logger'], 'log')
                .mockImplementation();

            await service.log({
                actorUserId: null,
                actorEmail: '',
                action: AuditAction.LOGIN_FAILED,
                resourceType: 'auth',
                resourceId: null,
                organizationId: null,
                metadata: { attempted: 'nobody@acme.test' },
            });

            expect(create).toHaveBeenCalledWith(
                expect.objectContaining({
                    metadata: { attempted: 'nobody@acme.test' },
                }),
            );
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('actor=(unknown)'),
            );
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('resource=auth:-'),
            );
            expect(loggerSpy).toHaveBeenCalledWith(
                expect.stringContaining('org=-'),
            );
        });
    });

    describe('findByOrgIds', () => {
        it('returns an empty array without querying when given no org ids', async () => {
            const createQueryBuilder = jest.fn();
            const repo = {
                createQueryBuilder,
            } as unknown as Repository<AuditLogEntity>;
            const service = new AuditService(repo);

            const result = await service.findByOrgIds([]);

            expect(result).toEqual([]);
            expect(createQueryBuilder).not.toHaveBeenCalled();
        });

        it('scopes the query to the given org ids, newest first', async () => {
            const qb = {
                where: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getMany: jest.fn().mockResolvedValue(['entry1', 'entry2']),
            };
            const repo = {
                createQueryBuilder: jest.fn().mockReturnValue(qb),
            } as unknown as Repository<AuditLogEntity>;
            const service = new AuditService(repo);

            const result = await service.findByOrgIds(['acme', 'acme-eng']);

            expect(qb.where).toHaveBeenCalledWith(
                'log.organizationId IN (:...orgIds)',
                {
                    orgIds: ['acme', 'acme-eng'],
                },
            );
            expect(qb.orderBy).toHaveBeenCalledWith('log.createdAt', 'DESC');
            expect(result).toEqual(['entry1', 'entry2']);
        });
    });
});
