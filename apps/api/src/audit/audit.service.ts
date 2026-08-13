import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditAction } from '@app/data';
import { AuditLogEntity } from '../entities';

export interface AuditLogInput {
    /** Null when the actor could not be identified (e.g. login with an unrecognized email). */
    actorUserId: string | null;
    actorEmail: string;
    action: AuditAction;
    resourceType: string;
    resourceId: string | null;
    organizationId: string | null;
    metadata?: Record<string, unknown> | null;
}

/**
 * Persists to SQLite (queryable by GET /audit-log) and mirrors to the
 * console — exceeds the spec's "console or file is sufficient" bar
 * intentionally, since the endpoint needs structured, filterable data.
 */
@Injectable()
export class AuditService {
    private readonly logger = new Logger('AuditLog');

    constructor(
        @InjectRepository(AuditLogEntity)
        private readonly repo: Repository<AuditLogEntity>,
    ) {}

    async log(input: AuditLogInput): Promise<void> {
        const entry = this.repo.create({
            ...input,
            metadata: input.metadata ?? null,
        });
        await this.repo.save(entry);
        this.logger.log(
            `${input.action} actor=${input.actorEmail || '(unknown)'} resource=${input.resourceType}:${
                input.resourceId ?? '-'
            } org=${input.organizationId ?? '-'}`,
        );
    }

    /**
     * Scoped the same way task visibility is: an Admin/Owner only sees audit
     * entries for orgs within their own accessible scope. Entries with no org
     * (e.g. a failed login for an email that matched no user) are excluded —
     * TODO(tradeoff): a true system-wide audit view for these would need a
     * separate "global" permission tier we didn't build for this assessment.
     */
    findByOrgIds(orgIds: string[]): Promise<AuditLogEntity[]> {
        if (orgIds.length === 0) {
            return Promise.resolve([]);
        }
        return this.repo
            .createQueryBuilder('log')
            .where('log.organizationId IN (:...orgIds)', { orgIds })
            .orderBy('log.createdAt', 'DESC')
            .take(200)
            .getMany();
    }
}
