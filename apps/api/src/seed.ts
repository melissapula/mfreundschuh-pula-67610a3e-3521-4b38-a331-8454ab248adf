/**
 * Standalone seed script — runs outside Nest's DI container via a plain
 * TypeORM DataSource, since it's a one-shot data-loading task, not a server.
 * `npm run seed` from the workspace root.
 */
import './register-path-aliases';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Role, TaskCategory, TaskStatus } from '@app/data';
import {
    AuditLogEntity,
    OrganizationEntity,
    TaskEntity,
    UserEntity,
} from './entities';

const DEV_PASSWORD = 'Password123!';

async function seed() {
    const dataSource = new DataSource({
        type: 'better-sqlite3',
        database: process.env.DB_PATH ?? 'data/db.sqlite',
        entities: [OrganizationEntity, UserEntity, TaskEntity, AuditLogEntity],
        synchronize: true,
    });
    await dataSource.initialize();

    const orgRepo = dataSource.getRepository(OrganizationEntity);
    const userRepo = dataSource.getRepository(UserEntity);
    const taskRepo = dataSource.getRepository(TaskEntity);
    const auditRepo = dataSource.getRepository(AuditLogEntity);

    // Idempotent: wipe and recreate the demo dataset every run.
    await auditRepo.clear();
    await taskRepo.clear();
    await userRepo.clear();
    await orgRepo.clear();

    const acme = await orgRepo.save(
        orgRepo.create({ name: 'Acme Corp', parentOrgId: null }),
    );
    const engineering = await orgRepo.save(
        orgRepo.create({
            name: 'Acme Corp / Engineering',
            parentOrgId: acme.id,
        }),
    );

    const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

    const owner = await userRepo.save(
        userRepo.create({
            email: 'owner@acme.test',
            passwordHash,
            role: Role.OWNER,
            organizationId: acme.id,
        }),
    );
    const admin = await userRepo.save(
        userRepo.create({
            email: 'admin@acme.test',
            passwordHash,
            role: Role.ADMIN,
            organizationId: acme.id,
        }),
    );
    const adminEng = await userRepo.save(
        userRepo.create({
            email: 'admin.eng@acme.test',
            passwordHash,
            role: Role.ADMIN,
            organizationId: engineering.id,
        }),
    );
    const viewer = await userRepo.save(
        userRepo.create({
            email: 'viewer@acme.test',
            passwordHash,
            role: Role.VIEWER,
            organizationId: engineering.id,
        }),
    );

    await taskRepo.save([
        taskRepo.create({
            title: 'Draft Q3 board update',
            description: 'Company-wide priorities for the board deck.',
            category: TaskCategory.WORK,
            status: TaskStatus.IN_PROGRESS,
            order: 0,
            ownerId: owner.id,
            organizationId: acme.id,
        }),
        taskRepo.create({
            title: 'Review vendor contract',
            description: 'Legal flagged two clauses to renegotiate.',
            category: TaskCategory.WORK,
            status: TaskStatus.TODO,
            order: 1,
            ownerId: admin.id,
            organizationId: acme.id,
        }),
        taskRepo.create({
            title: 'Fix flaky CI pipeline',
            description: 'Intermittent timeout in the e2e suite.',
            category: TaskCategory.WORK,
            status: TaskStatus.IN_PROGRESS,
            order: 0,
            ownerId: adminEng.id,
            organizationId: engineering.id,
        }),
        taskRepo.create({
            title: 'Pair on the RBAC guard tests',
            description: '',
            category: TaskCategory.WORK,
            status: TaskStatus.TODO,
            order: 1,
            ownerId: adminEng.id,
            organizationId: engineering.id,
        }),
        taskRepo.create({
            title: 'Read the new onboarding doc',
            description: '',
            category: TaskCategory.PERSONAL,
            status: TaskStatus.TODO,
            order: 2,
            ownerId: viewer.id,
            organizationId: engineering.id,
        }),
    ]);

    await dataSource.destroy();

    console.log(`
Seed complete. Org tree:
  Acme Corp (${acme.id})
    Acme Corp / Engineering (${engineering.id})

Demo users (all share password: ${DEV_PASSWORD}):
  owner@acme.test      OWNER  @ Acme Corp    -- sees/manages the full tree
  admin@acme.test      ADMIN  @ Acme Corp    -- sees/manages root + Engineering
  admin.eng@acme.test  ADMIN  @ Engineering  -- Engineering only, no upward visibility
  viewer@acme.test     VIEWER @ Engineering  -- read-only, Engineering only
`);
}

seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
