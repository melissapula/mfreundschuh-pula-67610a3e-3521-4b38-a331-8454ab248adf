import { Role } from '@app/data/browser';

/** Minimal org shape this module needs — callers pass in whatever they have (a TypeORM entity works fine). */
export interface OrgNode {
    id: string;
    parentOrgId: string | null;
}

export interface ScopeActor {
    role: Role;
    organizationId: string;
}

/**
 * Resolves which organization IDs an actor may see/manage tasks in.
 * This is the second, independent axis of the access model — role decides
 * WHAT an actor can do (see role-permissions.ts), org position decides
 * WHERE. The two are combined by callers (e.g. TasksService), not here.
 *
 * - VIEWER: exactly their own org node. No breadth at all.
 * - ADMIN:  their own org node plus its direct sub-orgs (downward only —
 *           an Admin seated at a sub-org cannot see the parent org).
 * - OWNER:  the entire tree containing their org (root + all sub-orgs),
 *           regardless of which node they personally sit in. This is what
 *           gives Owner "full org control" as distinct from Admin.
 *
 * Assumes a 2-level hierarchy (root orgs have parentOrgId === null; a
 * sub-org's parent is always a root), matching the data model's constraint.
 */
export function getAccessibleOrgIds(
    actor: ScopeActor,
    orgs: OrgNode[],
): string[] {
    const childrenOf = (id: string): string[] =>
        orgs.filter((o) => o.parentOrgId === id).map((o) => o.id);

    const rootOf = (id: string): string => {
        const node = orgs.find((o) => o.id === id);
        return node?.parentOrgId ?? id;
    };

    switch (actor.role) {
        case Role.VIEWER:
            return [actor.organizationId];
        case Role.ADMIN:
            return [actor.organizationId, ...childrenOf(actor.organizationId)];
        case Role.OWNER: {
            const root = rootOf(actor.organizationId);
            return [root, ...childrenOf(root)];
        }
    }
}
