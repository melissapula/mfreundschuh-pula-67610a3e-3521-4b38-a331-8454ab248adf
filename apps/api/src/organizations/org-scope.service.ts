import { Injectable } from '@nestjs/common';
import { AuthUser } from '@app/data';
import { getAccessibleOrgIds } from '@app/auth';
import { OrganizationsService } from './organizations.service';

/**
 * Thin app-layer wrapper around libs/auth's pure getAccessibleOrgIds: fetches
 * the current org tree and applies it. Lives alongside OrganizationsService
 * (not inside TasksModule) because both TasksModule and AuditModule need it —
 * putting it in either would create a circular module dependency.
 */
@Injectable()
export class OrgScopeService {
  constructor(private readonly organizations: OrganizationsService) {}

  async accessibleOrgIds(user: AuthUser): Promise<string[]> {
    const orgs = await this.organizations.findAll();
    return getAccessibleOrgIds({ role: user.role, organizationId: user.organizationId }, orgs);
  }
}
