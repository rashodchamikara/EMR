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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { OrganizationContextGuard } from '../auth/guards/organization-context.guard';
import { CreateFacilityDto } from './dto/create-facility.dto';
import {
  FacilityListResponseDto,
  FacilityResponseDto,
} from './dto/facility-response.dto';
import { QueryFacilitiesDto } from './dto/query-facilities.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
import { FacilitiesService } from './facilities.service';
@ApiTags('Facilities')
@ApiBearerAuth()
@UseGuards(OrganizationContextGuard)
@Controller('organizations/:organizationId/facilities')
export class FacilitiesController {
  constructor(private readonly facilitiesService: FacilitiesService) {}
  @Post()
  @RequirePermissions('facilities.create')
  @ApiOperation({ summary: 'Create a healthcare facility' })
  @ApiCreatedResponse({ type: FacilityResponseDto })
  @ApiConflictResponse({ description: 'The facility code already exists.' })
  create(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Body() dto: CreateFacilityDto,
  ): Promise<FacilityResponseDto> {
    return this.facilitiesService.create(organizationId, dto);
  }
  @Get()
  @RequirePermissions('facilities.read')
  @ApiOkResponse({ type: FacilityListResponseDto })
  findAll(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Query() query: QueryFacilitiesDto,
  ): Promise<FacilityListResponseDto> {
    return this.facilitiesService.findAll(organizationId, query);
  }
  @Get(':facilityId')
  @RequirePermissions('facilities.read')
  @ApiOkResponse({ type: FacilityResponseDto })
  @ApiNotFoundResponse({ description: 'Facility not found.' })
  findOne(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('facilityId', new ParseUUIDPipe({ version: '4' }))
    facilityId: string,
  ): Promise<FacilityResponseDto> {
    return this.facilitiesService.findOne(organizationId, facilityId);
  }
  @Patch(':facilityId')
  @RequirePermissions('facilities.update')
  @ApiOkResponse({ type: FacilityResponseDto })
  update(
    @Param('organizationId', new ParseUUIDPipe({ version: '4' }))
    organizationId: string,
    @Param('facilityId', new ParseUUIDPipe({ version: '4' }))
    facilityId: string,
    @Body() dto: UpdateFacilityDto,
  ): Promise<FacilityResponseDto> {
    return this.facilitiesService.update(organizationId, facilityId, dto);
  }
}
