import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthUser } from '@app/data';
import { UserEntity } from '../entities';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    private readonly jwt: JwtService,
  ) {}

  /**
   * Returns the user on success, or null on any failure (unknown email or
   * wrong password) — deliberately not distinguishing the two so the
   * controller can't leak which case occurred via timing or audit detail.
   */
  async validateCredentials(email: string, password: string): Promise<UserEntity | null> {
    const user = await this.users.findOne({ where: { email } });
    if (!user) {
      return null;
    }
    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? user : null;
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
