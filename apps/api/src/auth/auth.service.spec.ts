import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Role } from '@app/data';
import { AuthService } from './auth.service';
import { UserEntity } from '../entities';

describe('AuthService', () => {
  let service: AuthService;
  let users: { findOne: jest.Mock };
  let jwt: { sign: jest.Mock };
  let storedHash: string;

  const baseUser: Partial<UserEntity> = {
    id: 'user-1',
    email: 'admin@acme.test',
    role: Role.ADMIN,
    organizationId: 'acme',
  };

  beforeAll(async () => {
    storedHash = await bcrypt.hash('correct-password', 10);
  });

  beforeEach(() => {
    users = { findOne: jest.fn() };
    jwt = { sign: jest.fn().mockReturnValue('signed.jwt.token') };
    service = new AuthService(
      users as unknown as import('typeorm').Repository<UserEntity>,
      jwt as unknown as JwtService,
    );
  });

  describe('validateCredentials', () => {
    it('returns the user when email and password match', async () => {
      users.findOne.mockResolvedValue({
        ...baseUser,
        passwordHash: storedHash,
      });

      const result = await service.validateCredentials(
        'admin@acme.test',
        'correct-password',
      );

      expect(result).not.toBeNull();
      expect(result?.id).toBe('user-1');
    });

    it('returns null for a wrong password on a real account', async () => {
      users.findOne.mockResolvedValue({
        ...baseUser,
        passwordHash: storedHash,
      });

      const result = await service.validateCredentials(
        'admin@acme.test',
        'wrong-password',
      );

      expect(result).toBeNull();
    });

    it('returns null for an email with no matching account, without distinguishing the failure', async () => {
      users.findOne.mockResolvedValue(null);

      const result = await service.validateCredentials(
        'nobody@acme.test',
        'anything',
      );

      expect(result).toBeNull();
    });
  });

  describe('issueToken', () => {
    it('signs a payload containing role and organizationId (what RBAC checks read)', () => {
      const user = { ...baseUser, passwordHash: storedHash } as UserEntity;

      const { accessToken, user: authUser } = service.issueToken(user);

      expect(accessToken).toBe('signed.jwt.token');
      expect(authUser).toEqual({
        sub: 'user-1',
        email: 'admin@acme.test',
        role: Role.ADMIN,
        organizationId: 'acme',
      });
      expect(jwt.sign).toHaveBeenCalledWith(authUser);
    });
  });
});
