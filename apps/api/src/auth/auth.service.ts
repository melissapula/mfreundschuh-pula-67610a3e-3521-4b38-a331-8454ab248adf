import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthUser } from '@app/data';
import { UserEntity } from '../entities';

// A syntactically valid bcrypt hash with no corresponding real password.
// bcrypt.compare() always runs against *something* below — the real hash,
// or this one — so an unknown email and a wrong password take the same
// amount of time. Without this, returning early for "no such user" is a
// timing side-channel an attacker can use to enumerate valid emails.
const DUMMY_HASH = bcrypt.hashSync('no-account-has-this-password', 10);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Returns the user on success, or null on any failure (unknown email or
   * wrong password) — deliberately not distinguishing the two so the
   * controller can't leak which case occurred via timing or audit detail.
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<UserEntity | null> {
    const user = await this.users.findOne({ where: { email } });
    const matches = await bcrypt.compare(
      password,
      user?.passwordHash ?? DUMMY_HASH,
    );
    return user && matches ? user : null;
  }

  issueToken(user: UserEntity): { accessToken: string; user: AuthUser } {
    const payload: AuthUser = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };
    return { accessToken: this.jwt.sign(payload), user: payload };
  }
}
