import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RoomStatus, RoomType } from '../../generated/prisma/client';
import { CreateRoomDto } from './dto/create-room.dto';
import { QueryRoomsDto } from './dto/query-rooms.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { RoomsRepository } from './rooms.repository';

@Injectable()
export class RoomsService {
  constructor(private readonly repository: RoomsRepository) {}

  async create(organizationId: string, facilityId: string, dto: CreateRoomDto) {
    await this.requireFacility(organizationId, facilityId);

    if (dto.departmentId) {
      await this.requireDepartment(
        organizationId,
        facilityId,
        dto.departmentId,
      );
    }

    const code = dto.code.trim().toUpperCase();

    const duplicate = await this.repository.findByCode(facilityId, code);

    if (duplicate) {
      throw new ConflictException(
        'A room with this code already exists in the facility.',
      );
    }

    return this.repository.create({
      organizationId,
      facilityId,

      departmentId: dto.departmentId ?? null,

      code,
      name: dto.name.trim(),

      type: dto.type ?? RoomType.CONSULTATION,

      status: dto.status ?? RoomStatus.ACTIVE,

      floor: dto.floor?.trim() || null,

      capacity: dto.capacity ?? 1,

      notes: dto.notes?.trim() || null,
    });
  }

  async findMany(
    organizationId: string,
    facilityId: string,
    query: QueryRoomsDto,
  ) {
    await this.requireFacility(organizationId, facilityId);

    if (query.departmentId) {
      await this.requireDepartment(
        organizationId,
        facilityId,
        query.departmentId,
      );
    }

    return this.repository.findMany(organizationId, facilityId, {
      page: query.page,
      limit: query.limit,
      search: query.search,
      departmentId: query.departmentId,
      type: query.type,
      status: query.status,
    });
  }

  async findOne(organizationId: string, facilityId: string, roomId: string) {
    await this.requireFacility(organizationId, facilityId);

    const room = await this.repository.findById(
      organizationId,
      facilityId,
      roomId,
    );

    if (!room) {
      throw new NotFoundException('Room not found.');
    }

    return room;
  }

  async update(
    organizationId: string,
    facilityId: string,
    roomId: string,
    dto: UpdateRoomDto,
  ) {
    const current = await this.findOne(organizationId, facilityId, roomId);

    if (dto.departmentId) {
      await this.requireDepartment(
        organizationId,
        facilityId,
        dto.departmentId,
      );
    }

    const code = dto.code ? dto.code.trim().toUpperCase() : undefined;

    if (code && code !== current.code) {
      const duplicate = await this.repository.findByCode(facilityId, code);

      if (duplicate) {
        throw new ConflictException(
          'A room with this code already exists in the facility.',
        );
      }
    }

    return this.repository.update(roomId, {
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

      ...(dto.departmentId !== undefined
        ? {
            department: dto.departmentId
              ? {
                  connect: {
                    id: dto.departmentId,
                  },
                }
              : {
                  disconnect: true,
                },
          }
        : {}),

      ...(dto.type !== undefined
        ? {
            type: dto.type,
          }
        : {}),

      ...(dto.status !== undefined
        ? {
            status: dto.status,
          }
        : {}),

      ...(dto.floor !== undefined
        ? {
            floor: dto.floor.trim() || null,
          }
        : {}),

      ...(dto.capacity !== undefined
        ? {
            capacity: dto.capacity,
          }
        : {}),

      ...(dto.notes !== undefined
        ? {
            notes: dto.notes.trim() || null,
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

  private async requireDepartment(
    organizationId: string,
    facilityId: string,
    departmentId: string,
  ) {
    const department = await this.repository.findDepartment(
      organizationId,
      facilityId,
      departmentId,
    );

    if (!department) {
      throw new NotFoundException('Department not found in this facility.');
    }

    return department;
  }
}
