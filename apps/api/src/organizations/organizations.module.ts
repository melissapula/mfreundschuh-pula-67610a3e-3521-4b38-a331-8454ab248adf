import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrganizationEntity } from '../entities';
import { OrganizationsService } from './organizations.service';
import { OrgScopeService } from './org-scope.service';

@Module({
    imports: [TypeOrmModule.forFeature([OrganizationEntity])],
    providers: [OrganizationsService, OrgScopeService],
    exports: [OrganizationsService, OrgScopeService],
})
export class OrganizationsModule {}
