import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationEntity } from '../entities';

/**
 * No controller here on purpose — the assessment's API surface has no
 * org-management endpoints, so this stays an internal data source for
 * org-scope resolution (used by TasksService) rather than public CRUD.
 */
@Injectable()
export class OrganizationsService {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly repo: Repository<OrganizationEntity>,
  ) {}

  findAll(): Promise<OrganizationEntity[]> {
    return this.repo.find();
  }
}
