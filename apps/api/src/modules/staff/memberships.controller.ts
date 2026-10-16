import { Body, Controller, Get, Header, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.types';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { OrganizationContextGuard } from '../auth/guards/organization-context.guard';
import { CreateStaffDto, LinkStaffDto, QueryMembershipsDto, UpdateMembershipDto } from './dto/membership.dto';
import { StaffService } from './staff.service';
@ApiTags('Organization staff') @ApiBearerAuth()
@Controller('organizations/:organizationId/memberships') @UseGuards(OrganizationContextGuard)
export class MembershipsController {
  constructor(private readonly service: StaffService) {}
  @Get() @RequirePermissions('staff.read') @Header('Cache-Control', 'no-store')
  list(@Param('organizationId', ParseUUIDPipe) org: string, @Query() query: QueryMembershipsDto) { return this.service.members(org, query); }
  @Get('roles') @RequirePermissions('staff.read', 'roles.assign')
  roles(@CurrentUser() actor: AuthenticatedUser) { return this.service.roles(actor); }
  @Get('facilities') @RequirePermissions('staff.read')
  facilities(@Param('organizationId', ParseUUIDPipe) org: string) { return this.service.facilities(org); }
  @Post() @RequirePermissions('staff.read', 'staff.create', 'roles.assign') @Header('Cache-Control', 'no-store')
  create(@Param('organizationId', ParseUUIDPipe) org: string, @Body() dto: CreateStaffDto, @CurrentUser() actor: AuthenticatedUser) { return this.service.create(org, dto, actor); }
  @Post('link-existing') @RequirePermissions('staff.read', 'staff.create', 'roles.assign') @Header('Cache-Control', 'no-store')
  link(@Param('organizationId', ParseUUIDPipe) org: string, @Body() dto: LinkStaffDto, @CurrentUser() actor: AuthenticatedUser) { return this.service.link(org, dto, actor); }
  @Patch(':membershipId') @RequirePermissions('staff.read', 'staff.update') @Header('Cache-Control', 'no-store')
  update(@Param('organizationId', ParseUUIDPipe) org: string, @Param('membershipId', ParseUUIDPipe) id: string, @Body() dto: UpdateMembershipDto, @CurrentUser() actor: AuthenticatedUser) { return this.service.updateMember(org, id, dto, actor); }
}
