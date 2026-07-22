import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import {
  OrganizationListResponseDto,
  OrganizationResponseDto,
} from './dto/organization-response.dto';
import { QueryOrganizationsDto } from './dto/query-organizations.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { OrganizationsService } from './organizations.service';
import { ApiBearerAuth } from '@nestjs/swagger';
import { RequirePermissions, } from '../auth/decorators/require-permissions.decorator';
@ApiTags('Organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizationsService: OrganizationsService) {}
  @Post()
  @RequirePermissions('organizations.create')
  @ApiOperation({ summary: 'Create an organization' })
  @ApiCreatedResponse({ type: OrganizationResponseDto })
  @ApiConflictResponse({ description: 'The organization code already exists.' })
  create(@Body() dto: CreateOrganizationDto): Promise<OrganizationResponseDto> {
    return this.organizationsService.create(dto);
  }
  @Get()
  @RequirePermissions('organizations.read')
  @ApiOperation({ summary: 'List organizations' })
  @ApiOkResponse({ type: OrganizationListResponseDto })
  findAll(
    @Query() query: QueryOrganizationsDto,
  ): Promise<OrganizationListResponseDto> {
    return this.organizationsService.findAll(query);
  }
  @Get(':id')
  @RequirePermissions('organizations.read')
  @ApiOperation({ summary: 'Get one organization' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found.' })
  findOne(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.findOne(id);
  }
  @Patch(':id')
  @RequirePermissions('organizations.update')
  @ApiOperation({ summary: 'Update an organization' })
  @ApiOkResponse({ type: OrganizationResponseDto })
  @ApiNotFoundResponse({ description: 'Organization not found.' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<OrganizationResponseDto> {
    return this.organizationsService.update(id, dto);
  }
}
