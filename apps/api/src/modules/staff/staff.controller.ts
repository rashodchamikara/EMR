import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { OrganizationContextGuard } from '../auth/guards/organization-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { AssignStaffDto } from './dto/assign-staff.dto';
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
}
