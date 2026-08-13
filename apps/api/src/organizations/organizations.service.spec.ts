import { Repository } from 'typeorm';
import { OrganizationsService } from './organizations.service';
import { OrganizationEntity } from '../entities';

describe('OrganizationsService', () => {
    it('findAll() returns every organization from the repository', async () => {
        const orgs = [
            { id: 'acme', name: 'Acme Corp', parentOrgId: null },
            { id: 'acme-eng', name: 'Engineering', parentOrgId: 'acme' },
        ];
        const repo = {
            find: jest.fn().mockResolvedValue(orgs),
        } as unknown as Repository<OrganizationEntity>;
        const service = new OrganizationsService(repo);

        const result = await service.findAll();

        expect(repo.find).toHaveBeenCalled();
        expect(result).toEqual(orgs);
    });
});
