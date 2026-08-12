import { Body, Controller, HttpCode, HttpStatus, Post, UnauthorizedException } from '@nestjs/common';
import { AuditAction, LoginDto } from '@app/data';
import { Public } from '@app/auth';
import { AuthService } from './auth.service';
import { AuditService } from '../audit/audit.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto) {
    const user = await this.auth.validateCredentials(dto.email, dto.password);

    if (!user) {
      await this.audit.log({
        actorUserId: '',
        actorEmail: dto.email,
        action: AuditAction.LOGIN_FAILED,
        resourceType: 'auth',
        resourceId: null,
        organizationId: null,
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const { accessToken, user: authUser } = this.auth.issueToken(user);

    await this.audit.log({
      actorUserId: user.id,
      actorEmail: user.email,
      action: AuditAction.LOGIN,
      resourceType: 'auth',
      resourceId: null,
      organizationId: user.organizationId,
    });

    return { accessToken, user: authUser };
  }
}
