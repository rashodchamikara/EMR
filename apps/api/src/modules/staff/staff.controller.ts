import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { OrganizationContextGuard } from '../auth/guards/organization-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AssignStaffDto } from './dto/assign-staff.dto';
import { UpdateStaffAssignmentDto } from './dto/update-staff-assignment.dto';
import { StaffService } from './staff.service';

@ApiTags('Staff')
@ApiBearerAuth()
@Controller('organizations/:organizationId/facilities/:facilityId/staff')
@UseGuards(OrganizationContextGuard, PermissionsGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Get()
  @RequirePermissions('staff.read')
  findMany(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('facilityId', ParseUUIDPipe)
    facilityId: string,
  ) {
    return this.staffService.findMany(organizationId, facilityId);
  }

  @Post()
  @RequirePermissions('staff.assign')
  assign(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('facilityId', ParseUUIDPipe)
    facilityId: string,

    @Body()
    dto: AssignStaffDto,
  ) {
    return this.staffService.assign(organizationId, facilityId, dto);
  }

  @Patch(':assignmentId')
  @RequirePermissions('staff.update')
  update(
    @Param('organizationId', ParseUUIDPipe) org: string,
    @Param('facilityId', ParseUUIDPipe) facility: string,
    @Param('assignmentId', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStaffAssignmentDto,
  ) { return this.staffService.updateAssignment(org, facility, id, dto); }
}
