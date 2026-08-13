import { Role } from '@app/data/browser';
import { getAccessibleOrgIds, OrgNode } from './org-scope';

describe('org-scope', () => {
    // Acme Corp (root) has one sub-org, Engineering. A second root org, Globex,
    // exists purely to prove there's no cross-tree leakage.
    const orgs: OrgNode[] = [
        { id: 'acme', parentOrgId: null },
        { id: 'acme-eng', parentOrgId: 'acme' },
        { id: 'globex', parentOrgId: null },
    ];

    describe('Viewer', () => {
        it('sees only their own org node, never siblings or parent', () => {
            const ids = getAccessibleOrgIds(
                { role: Role.VIEWER, organizationId: 'acme-eng' },
                orgs,
            );
            expect(ids).toEqual(['acme-eng']);
        });
    });

    describe('Admin', () => {
        it('at the root sees the root plus its direct sub-orgs', () => {
            const ids = getAccessibleOrgIds(
                { role: Role.ADMIN, organizationId: 'acme' },
                orgs,
            );
            expect(ids.sort()).toEqual(['acme', 'acme-eng']);
        });

        it('at a sub-org sees only that sub-org — no upward visibility into the parent', () => {
            const ids = getAccessibleOrgIds(
                { role: Role.ADMIN, organizationId: 'acme-eng' },
                orgs,
            );
            expect(ids).toEqual(['acme-eng']);
        });

        it('never crosses into an unrelated org tree', () => {
            const ids = getAccessibleOrgIds(
                { role: Role.ADMIN, organizationId: 'acme' },
                orgs,
            );
            expect(ids).not.toContain('globex');
        });
    });

    describe('Owner', () => {
        it('seated at the root sees the whole tree', () => {
            const ids = getAccessibleOrgIds(
                { role: Role.OWNER, organizationId: 'acme' },
                orgs,
            );
            expect(ids.sort()).toEqual(['acme', 'acme-eng']);
        });

        it('seated at a sub-org still sees the whole tree (full org control, not just their node)', () => {
            const ids = getAccessibleOrgIds(
                { role: Role.OWNER, organizationId: 'acme-eng' },
                orgs,
            );
            expect(ids.sort()).toEqual(['acme', 'acme-eng']);
        });

        it('never crosses into an unrelated org tree', () => {
            const ids = getAccessibleOrgIds(
                { role: Role.OWNER, organizationId: 'acme' },
                orgs,
            );
            expect(ids).not.toContain('globex');
        });
    });
});
