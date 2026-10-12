import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { OrganizationContextGuard } from '../auth/guards/organization-context.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { CreatePractitionerDto } from './dto/create-practitioner.dto';
import { QueryPractitionersDto } from './dto/query-practitioners.dto';
import { UpdatePractitionerDto } from './dto/update-practitioner.dto';
import { PractitionersService } from './practitioners.service';

@ApiTags('Practitioners')
@ApiBearerAuth()
@Controller('organizations/:organizationId/practitioners')
@UseGuards(OrganizationContextGuard, PermissionsGuard)
export class PractitionersController {
  constructor(private readonly practitionersService: PractitionersService) {}

  @Post()
  @RequirePermissions('practitioners.create')
  @ApiOperation({
    summary: 'Create a practitioner profile',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Active organization UUID',
  })
  create(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Body()
    dto: CreatePractitionerDto,
  ) {
    return this.practitionersService.create(organizationId, dto);
  }

  @Get()
  @RequirePermissions('practitioners.read')
  @ApiOperation({
    summary: 'List practitioners in the organization',
  })
  findMany(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Query()
    query: QueryPractitionersDto,
  ) {
    return this.practitionersService.findMany(organizationId, query);
  }

  @Get(':practitionerId')
  @RequirePermissions('practitioners.read')
  @ApiOperation({
    summary: 'Get one practitioner profile',
  })
  @ApiParam({
    name: 'practitionerId',
    description: 'Practitioner UUID',
  })
  findOne(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('practitionerId', ParseUUIDPipe)
    practitionerId: string,
  ) {
    return this.practitionersService.findOne(organizationId, practitionerId);
  }

  @Patch(':practitionerId')
  @RequirePermissions('practitioners.update')
  @ApiOperation({
    summary: 'Update a practitioner profile',
  })
  update(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('practitionerId', ParseUUIDPipe)
    practitionerId: string,

    @Body()
    dto: UpdatePractitionerDto,
  ) {
    return this.practitionersService.update(
      organizationId,
      practitionerId,
      dto,
    );
  }
}
