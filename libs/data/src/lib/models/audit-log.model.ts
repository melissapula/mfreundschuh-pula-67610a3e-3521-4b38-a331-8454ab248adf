import { AuditAction } from '../enums/audit-action.enum';

export interface AuditLog {
    id: string;
    actorUserId: string;
    actorEmail: string;
    action: AuditAction;
    resourceType: string;
    resourceId: string | null;
    organizationId: string | null;
    metadata: Record<string, unknown> | null;
    createdAt: string;
}
