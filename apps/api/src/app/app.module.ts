import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PermissionsGuard } from '@app/auth';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import {
    AuditLogEntity,
    OrganizationEntity,
    TaskEntity,
    UserEntity,
} from '../entities';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TasksModule } from '../tasks/tasks.module';

@Module({
    imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                type: 'better-sqlite3' as const,
                database: config.get<string>('DB_PATH', 'data/db.sqlite'),
                entities: [
                    OrganizationEntity,
                    UserEntity,
                    TaskEntity,
                    AuditLogEntity,
                ],
                // TODO(tradeoff): synchronize:true auto-creates the schema from entities for
                // fast local iteration. A real deployment would use TypeORM migrations
                // instead so schema changes are reviewable and reversible.
                synchronize: true,
            }),
        }),
        // Global default: 100 requests/minute/IP. Individual routes (login) set
        // a much stricter limit via @Throttle() — see AuthController.
        ThrottlerModule.forRoot([{ name: 'default', ttl: 60_000, limit: 100 }]),
        AuthModule,
        AuditModule,
        OrganizationsModule,
        TasksModule,
    ],
    controllers: [AppController],
    providers: [
        AppService,
        // Order matters: ThrottlerGuard runs first so unauthenticated brute-force
        // attempts get rate-limited before JwtAuthGuard even runs; JwtAuthGuard
        // must run before PermissionsGuard to populate request.user.
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: PermissionsGuard },
    ],
})
export class AppModule {}
