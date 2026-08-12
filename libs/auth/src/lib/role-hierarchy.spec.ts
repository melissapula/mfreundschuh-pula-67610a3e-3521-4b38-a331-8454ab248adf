import { Role } from '@app/data/browser';
import { roleAtLeast, roleRank } from './role-hierarchy';

describe('role-hierarchy', () => {
  it('ranks roles Owner > Admin > Viewer', () => {
    expect(roleRank(Role.OWNER)).toBeGreaterThan(roleRank(Role.ADMIN));
    expect(roleRank(Role.ADMIN)).toBeGreaterThan(roleRank(Role.VIEWER));
  });

  describe('roleAtLeast', () => {
    it('lets a role satisfy its own requirement', () => {
      expect(roleAtLeast(Role.ADMIN, Role.ADMIN)).toBe(true);
    });

    it('lets Owner satisfy any lower requirement (inheritance)', () => {
      expect(roleAtLeast(Role.OWNER, Role.ADMIN)).toBe(true);
      expect(roleAtLeast(Role.OWNER, Role.VIEWER)).toBe(true);
    });

    it('lets Admin satisfy Viewer but not Owner', () => {
      expect(roleAtLeast(Role.ADMIN, Role.VIEWER)).toBe(true);
      expect(roleAtLeast(Role.ADMIN, Role.OWNER)).toBe(false);
    });

    it('does not let Viewer satisfy anything above Viewer', () => {
      expect(roleAtLeast(Role.VIEWER, Role.ADMIN)).toBe(false);
      expect(roleAtLeast(Role.VIEWER, Role.OWNER)).toBe(false);
    });
  });
});
