import { Injectable } from '@nestjs/common';
import { Prisma, RoomStatus, RoomType } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';

interface CreateRoomData {
  organizationId: string;
  facilityId: string;
  departmentId: string | null;
  code: string;
  name: string;
  type: RoomType;
  status: RoomStatus;
  floor: string | null;
  capacity: number;
  notes: string | null;
}

@Injectable()
export class RoomsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFacility(organizationId: string, facilityId: string) {
    return this.prisma.facility.findFirst({
      where: {
        id: facilityId,
        organizationId,
      },
    });
  }

  findDepartment(
    organizationId: string,
    facilityId: string,
    departmentId: string,
  ) {
    return this.prisma.department.findFirst({
      where: {
        id: departmentId,
        organizationId,
        facilityId,
      },
    });
  }

  findByCode(facilityId: string, code: string) {
    return this.prisma.room.findFirst({
      where: {
        facilityId,
        code,
      },
    });
  }

  create(data: CreateRoomData) {
    return this.prisma.room.create({
      data,

      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  async findMany(
    organizationId: string,
    facilityId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      departmentId?: string;
      type?: RoomType;
      status?: RoomStatus;
    },
  ) {
    const skip = (options.page - 1) * options.limit;

    const search = options.search?.trim();

    const where: Prisma.RoomWhereInput = {
      organizationId,
      facilityId,

      ...(options.departmentId
        ? {
            departmentId: options.departmentId,
          }
        : {}),

      ...(options.type
        ? {
            type: options.type,
          }
        : {}),

      ...(options.status
        ? {
            status: options.status,
          }
        : {}),

      ...(search
        ? {
            OR: [
              {
                code: {
                  contains: search,
                },
              },
              {
                name: {
                  contains: search,
                },
              },
            ],
          }
        : {}),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.room.findMany({
        where,
        skip,
        take: options.limit,

        include: {
          department: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
        },

        orderBy: [
          {
            status: 'asc',
          },
          {
            name: 'asc',
          },
        ],
      }),

      this.prisma.room.count({
        where,
      }),
    ]);

    return {
      data,

      meta: {
        page: options.page,
        limit: options.limit,
        total,

        totalPages: total === 0 ? 0 : Math.ceil(total / options.limit),
      },
    };
  }

  findById(organizationId: string, facilityId: string, roomId: string) {
    return this.prisma.room.findFirst({
      where: {
        id: roomId,
        organizationId,
        facilityId,
      },

      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }

  update(roomId: string, data: Prisma.RoomUpdateInput) {
    return this.prisma.room.update({
      where: {
        id: roomId,
      },

      data,

      include: {
        department: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }
}
