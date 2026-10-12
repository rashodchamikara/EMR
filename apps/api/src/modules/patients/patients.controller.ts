import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Post, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { OrganizationContextGuard } from '../auth/guards/organization-context.guard';
import { QueryPatientsDto, SavePatientDto, UpdatePatientDto } from './dto/patient.dto';
import { PatientsService } from './patients.service';

@ApiTags('Patients')
@ApiBearerAuth()
@Controller('organizations/:organizationId/patients')
@UseGuards(OrganizationContextGuard)
export class PatientsController {
  constructor(private readonly service: PatientsService) {}
  @Get('facility-options') @RequirePermissions('patients.read') @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Facility names for patient registration and filtering' })
  facilities(@Param('organizationId', ParseUUIDPipe) organizationId: string) { return this.service.facilities(organizationId); }
  @Get() @RequirePermissions('patients.read') @Header('Cache-Control', 'no-store')
  findMany(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Query() query: QueryPatientsDto) { return this.service.findMany(organizationId, query); }
  @Get(':patientId') @RequirePermissions('patients.read') @Header('Cache-Control', 'no-store')
  findOne(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('patientId', ParseUUIDPipe) id: string) { return this.service.findOne(organizationId, id); }
  @Post() @RequirePermissions('patients.read', 'patients.create') @Header('Cache-Control', 'no-store')
  create(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Body() dto: SavePatientDto) { return this.service.create(organizationId, dto); }
  @Put(':patientId') @RequirePermissions('patients.read', 'patients.update') @Header('Cache-Control', 'no-store')
  @ApiOperation({ summary: 'Replace editable patient details, facility links, and contacts; MRN stays unchanged' })
  update(@Param('organizationId', ParseUUIDPipe) organizationId: string, @Param('patientId', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto) { return this.service.update(organizationId, id, dto); }
}
