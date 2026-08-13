import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Role } from '@app/data';
import { OrganizationEntity } from './organization.entity';

@Entity('users')
export class UserEntity {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ unique: true })
    email!: string;

    /** bcrypt hash — never the plaintext password. */
    @Column()
    passwordHash!: string;

    @Column({ type: 'text' })
    role!: Role;

    @Column({ type: 'uuid' })
    organizationId!: string;

    @ManyToOne(() => OrganizationEntity)
    @JoinColumn({ name: 'organizationId' })
    organization?: OrganizationEntity;
}
