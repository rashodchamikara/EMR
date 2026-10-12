import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { QueryDepartmentsDto } from './dto/query-departments.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';
import { DepartmentsService } from './departments.service';

// Copy these exact imports from your existing FacilitiesController:
// Access-token guard
// OrganizationContextGuard
// PermissionsGuard
// Permission decorator

@ApiTags('Departments')
@ApiBearerAuth()
@Controller('organizations/:organizationId/facilities/:facilityId/departments')
@UseGuards(/* same three guards used by FacilitiesController */)
export class DepartmentsController {
  constructor(private readonly service: DepartmentsService) {}

  @Post()
  // Apply departments.create permission.
  create(
    @Param('organizationId')
    organizationId: string,

    @Param('facilityId')
    facilityId: string,

    @Body()
    dto: CreateDepartmentDto,
  ) {
    return this.service.create(organizationId, facilityId, dto);
  }

  @Get()
  // Apply departments.read permission.
  findMany(
    @Param('organizationId')
    organizationId: string,

    @Param('facilityId')
    facilityId: string,

    @Query()
    query: QueryDepartmentsDto,
  ) {
    return this.service.findMany(organizationId, facilityId, query);
  }

  @Get(':departmentId')
  // Apply departments.read permission.
  findOne(
    @Param('organizationId')
    organizationId: string,

    @Param('facilityId')
    facilityId: string,

    @Param('departmentId')
    departmentId: string,
  ) {
    return this.service.findOne(organizationId, facilityId, departmentId);
  }

  @Patch(':departmentId')
  // Apply departments.update permission.
  update(
    @Param('organizationId')
    organizationId: string,

    @Param('facilityId')
    facilityId: string,

    @Param('departmentId')
    departmentId: string,

    @Body()
    dto: UpdateDepartmentDto,
  ) {
    return this.service.update(organizationId, facilityId, departmentId, dto);
  }
}
