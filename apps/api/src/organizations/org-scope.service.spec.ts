import { AuthUser, Role } from '@app/data';
import { OrgScopeService } from './org-scope.service';
import { OrganizationsService } from './organizations.service';

describe('OrgScopeService', () => {
  it('fetches the org tree and delegates to the pure libs/auth resolver', async () => {
    const orgs = [
      { id: 'acme', parentOrgId: null },
      { id: 'acme-eng', parentOrgId: 'acme' },
    ];
    const organizations = {
      findAll: jest.fn().mockResolvedValue(orgs),
    } as unknown as OrganizationsService;
    const service = new OrgScopeService(organizations);

    const user: AuthUser = {
      sub: 'u1',
      email: 'a@acme.test',
      role: Role.ADMIN,
      organizationId: 'acme',
    };
    const orgIds = await service.accessibleOrgIds(user);

    expect(organizations.findAll).toHaveBeenCalled();
    expect(orgIds.sort()).toEqual(['acme', 'acme-eng']);
  });
});
