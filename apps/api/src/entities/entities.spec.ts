import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Role, TaskCategory, TaskStatus } from '@app/data';
import {
    AuditLogEntity,
    OrganizationEntity,
    TaskEntity,
    UserEntity,
} from './index';

/**
 * Unlike every other spec in this project, this one doesn't mock the
 * Repository — it builds a real (in-memory) TypeORM DataSource against
 * these four entities, the same way app.module.ts wires the real one.
 * That's deliberate: relation options like `@ManyToOne(() => UserEntity)`
 * take a *function* TypeORM only calls when it actually resolves entity
 * metadata — never triggered by the mocked-repository unit tests
 * elsewhere, so a real typo in a relation (wrong target entity, wrong
 * join column) would silently pass every other test in this app. This is
 * the one test that would actually catch that.
 */
describe('Entity schema', () => {
    let dataSource: DataSource;

    beforeAll(async () => {
        dataSource = new DataSource({
            type: 'better-sqlite3',
            database: ':memory:',
            entities: [
                OrganizationEntity,
                UserEntity,
                TaskEntity,
                AuditLogEntity,
            ],
            synchronize: true,
        });
        await dataSource.initialize();
    });

    afterAll(async () => {
        await dataSource.destroy();
    });

    it('synchronizes a schema where every relation resolves to the right target entity', async () => {
        const orgs = dataSource.getRepository(OrganizationEntity);
        const users = dataSource.getRepository(UserEntity);
        const tasks = dataSource.getRepository(TaskEntity);

        const root = await orgs.save(
            orgs.create({ name: 'Acme Corp', parentOrgId: null }),
        );
        const child = await orgs.save(
            orgs.create({ name: 'Engineering', parentOrgId: root.id }),
        );
        const owner = await users.save(
            users.create({
                email: 'admin@acme.test',
                passwordHash: 'hash',
                role: Role.ADMIN,
                organizationId: child.id,
            }),
        );
        const task = await tasks.save(
            tasks.create({
                title: 'Ship it',
                category: TaskCategory.WORK,
                status: TaskStatus.TODO,
                order: 0,
                ownerId: owner.id,
                organizationId: child.id,
            }),
        );

        const loadedTask = await tasks.findOne({
            where: { id: task.id },
            relations: { owner: true, organization: true },
        });
        expect(loadedTask?.owner?.email).toBe('admin@acme.test');
        expect(loadedTask?.organization?.id).toBe(child.id);

        const loadedChildOrg = await orgs.findOne({
            where: { id: child.id },
            relations: { parent: true },
        });
        expect(loadedChildOrg?.parent?.id).toBe(root.id);

        const loadedRootOrg = await orgs.findOne({
            where: { id: root.id },
            relations: { children: true },
        });
        expect(loadedRootOrg?.children?.map((c) => c.id)).toEqual([child.id]);

        const loadedUser = await users.findOne({
            where: { id: owner.id },
            relations: { organization: true },
        });
        expect(loadedUser?.organization?.id).toBe(child.id);
    });
});
