import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { TaskCategory, TaskStatus } from '@app/data';
import { UserEntity } from './user.entity';
import { OrganizationEntity } from './organization.entity';

@Entity('tasks')
export class TaskEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column()
    title!: string;

    @Column({ type: 'text', default: '' })
    description!: string;

    @Column({ type: 'text' })
    category!: TaskCategory;

    @Column({ type: 'text', default: TaskStatus.TODO })
    status!: TaskStatus;

    /** Position for drag-and-drop ordering. */
    @Column({ type: 'int', default: 0 })
    order!: number;

    @Column({ type: 'uuid' })
    ownerId!: string;

    @ManyToOne(() => UserEntity)
    @JoinColumn({ name: 'ownerId' })
    owner?: UserEntity;

    /** Set from the owner's org at creation time; immutable afterward — this is what org-scope checks filter on. */
    @Column({ type: 'uuid' })
    organizationId!: string;

    @ManyToOne(() => OrganizationEntity)
    @JoinColumn({ name: 'organizationId' })
    organization?: OrganizationEntity;

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn()
    updatedAt!: Date;
}
