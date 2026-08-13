import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditAction } from '@app/data';

@Entity('audit_logs')
export class AuditLogEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    /** Null when the actor could not be identified (e.g. login with an unrecognized email). */
    @Column({ type: 'uuid', nullable: true })
    actorUserId!: string | null;

    @Column()
    actorEmail!: string;

    @Column({ type: 'text' })
    action!: AuditAction;

    @Column()
    resourceType!: string;

    @Column({ type: 'uuid', nullable: true })
    resourceId!: string | null;

    @Index()
    @Column({ type: 'uuid', nullable: true })
    organizationId!: string | null;

    @Column({ type: 'simple-json', nullable: true })
    metadata!: Record<string, unknown> | null;

    @CreateDateColumn()
    createdAt!: Date;
}
