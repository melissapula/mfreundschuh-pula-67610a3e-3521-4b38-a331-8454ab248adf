import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskEntity } from '../entities';
import { AuditModule } from '../audit/audit.module';
import { OrganizationsModule } from '../organizations/organizations.module';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([TaskEntity]),
    AuditModule,
    OrganizationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService],
})
export class TasksModule {}
