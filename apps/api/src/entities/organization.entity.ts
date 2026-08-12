import { Column, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity('organizations')
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  /** null = root org. Non-null = sub-org of a root; hierarchy is capped at 2 levels by application logic. */
  @Column({ type: 'uuid', nullable: true })
  parentOrgId!: string | null;

  @ManyToOne(() => OrganizationEntity, (org) => org.children, { nullable: true })
  @JoinColumn({ name: 'parentOrgId' })
  parent?: OrganizationEntity | null;

  @OneToMany(() => OrganizationEntity, (org) => org.parent)
  children?: OrganizationEntity[];
}
