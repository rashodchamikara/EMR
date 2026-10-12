import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DepartmentStatus } from '../../generated/prisma/client';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentsDto } from './dto/query-departments.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsRepository } from './departments.repository';

@Injectable()
export class DepartmentsService {
  constructor(private readonly repository: DepartmentsRepository) {}

  async create(
    organizationId: string,
    facilityId: string,
    dto: CreateDepartmentDto,
  ) {
    await this.requireFacility(organizationId, facilityId);

    const code = dto.code.trim().toUpperCase();

    const existing = await this.repository.findByCode(facilityId, code);

    if (existing) {
      throw new ConflictException(
        'A department with this code already exists in the facility.',
      );
    }

    return this.repository.create({
      organizationId,
      facilityId,
      code,
      name: dto.name.trim(),

      description: dto.description?.trim() || null,

      status: dto.status ?? DepartmentStatus.ACTIVE,
    });
  }

  async findMany(
    organizationId: string,
    facilityId: string,
    query: QueryDepartmentsDto,
  ) {
    await this.requireFacility(organizationId, facilityId);

    return this.repository.findMany(organizationId, facilityId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      status: query.status,
    });
  }

  async findOne(
    organizationId: string,
    facilityId: string,
    departmentId: string,
  ) {
    await this.requireFacility(organizationId, facilityId);

    const department = await this.repository.findById(
      organizationId,
      facilityId,
      departmentId,
    );

    if (!department) {
      throw new NotFoundException('Department not found.');
    }

    return department;
  }

  async update(
    organizationId: string,
    facilityId: string,
    departmentId: string,
    dto: UpdateDepartmentDto,
  ) {
    const current = await this.findOne(
      organizationId,
      facilityId,
      departmentId,
    );

    const code = dto.code ? dto.code.trim().toUpperCase() : undefined;

    if (code && code !== current.code) {
      const duplicate = await this.repository.findByCode(facilityId, code);

      if (duplicate) {
        throw new ConflictException(
          'A department with this code already exists in the facility.',
        );
      }
    }

    return this.repository.update(departmentId, {
      ...(code
        ? {
            code,
          }
        : {}),

      ...(dto.name !== undefined
        ? {
            name: dto.name.trim(),
          }
        : {}),

      ...(dto.description !== undefined
        ? {
            description: dto.description.trim() || null,
          }
        : {}),

      ...(dto.status !== undefined
        ? {
            status: dto.status,
          }
        : {}),
    });
  }

  private async requireFacility(organizationId: string, facilityId: string) {
    const facility = await this.repository.findFacility(
      organizationId,
      facilityId,
    );

    if (!facility) {
      throw new NotFoundException('Facility not found.');
    }

    return facility;
  }
}
