import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserEntity } from '../entities';
import { AuditModule } from '../audit/audit.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
    imports: [
        TypeOrmModule.forFeature([UserEntity]),
        PassportModule,
        AuditModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.get<string>(
                    'JWT_SECRET',
                    'dev-secret-change-me',
                ),
                // Numeric seconds (not a "15m"-style string): ConfigService doesn't coerce
                // env strings to numbers on its own, and a plain number sidesteps
                // @nestjs/jwt's branded StringValue type entirely.
                signOptions: {
                    expiresIn: parseInt(
                        config.get<string>('JWT_EXPIRES_IN_SECONDS', '900'),
                        10,
                    ),
                },
            }),
        }),
    ],
    controllers: [AuthController],
    providers: [AuthService, JwtStrategy, JwtAuthGuard],
    exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
