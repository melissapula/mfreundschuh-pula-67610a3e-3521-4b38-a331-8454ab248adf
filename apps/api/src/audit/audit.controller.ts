import { Controller, Get } from '@nestjs/common';
import { AuthUser, Permission } from '@app/data';
import { CurrentUser, RequirePermission } from '@app/auth';
import { AuditService } from './audit.service';
import { OrgScopeService } from '../organizations/org-scope.service';

@Controller('audit-log')
export class AuditController {
    constructor(
        private readonly audit: AuditService,
        private readonly orgScope: OrgScopeService,
    ) {}

    @Get()
    @RequirePermission(Permission.AUDIT_READ)
    async findAll(@CurrentUser() user: AuthUser) {
        const orgIds = await this.orgScope.accessibleOrgIds(user);
        return this.audit.findByOrgIds(orgIds);
    }
}
