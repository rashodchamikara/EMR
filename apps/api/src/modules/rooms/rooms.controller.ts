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
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsService } from './rooms.service';

@ApiTags('Rooms')
@ApiBearerAuth()
@Controller('organizations/:organizationId/facilities/:facilityId/rooms')
@UseGuards(OrganizationContextGuard)
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  @RequirePermissions('rooms.create')
  @ApiOperation({
    summary: 'Create a room within a facility',
  })
  @ApiParam({
    name: 'organizationId',
    description: 'Active organization UUID',
  })
  @ApiParam({
    name: 'facilityId',
    description: 'Facility UUID',
  })
  create(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('facilityId', ParseUUIDPipe)
    facilityId: string,

    @Body()
    dto: CreateRoomDto,
  ) {
    return this.roomsService.create(organizationId, facilityId, dto);
  }

  @Get()
  @RequirePermissions('rooms.read')
  @ApiOperation({
    summary: 'List rooms within a facility',
  })
  findMany(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('facilityId', ParseUUIDPipe)
    facilityId: string,

    @Query()
    query: QueryRoomsDto,
  ) {
    return this.roomsService.findMany(organizationId, facilityId, query);
  }

  @Get(':roomId')
  @RequirePermissions('rooms.read')
  @ApiOperation({
    summary: 'Get one room',
  })
  @ApiParam({
    name: 'roomId',
    description: 'Room UUID',
  })
  findOne(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('facilityId', ParseUUIDPipe)
    facilityId: string,

    @Param('roomId', ParseUUIDPipe)
    roomId: string,
  ) {
    return this.roomsService.findOne(organizationId, facilityId, roomId);
  }

  @Patch(':roomId')
  @RequirePermissions('rooms.update')
  @ApiOperation({
    summary: 'Update a room',
  })
  update(
    @Param('organizationId', ParseUUIDPipe)
    organizationId: string,

    @Param('facilityId', ParseUUIDPipe)
    facilityId: string,

    @Param('roomId', ParseUUIDPipe)
    roomId: string,

    @Body()
    dto: UpdateRoomDto,
  ) {
    return this.roomsService.update(organizationId, facilityId, roomId, dto);
  }
}
