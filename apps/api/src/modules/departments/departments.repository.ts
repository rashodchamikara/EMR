import { Injectable } from '@nestjs/common';
import { DepartmentStatus, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../database/prisma.service';

interface CreateDepartmentData {
  organizationId: string;
  facilityId: string;
  code: string;
  name: string;
  description: string | null;
  status: DepartmentStatus;
}

interface UpdateDepartmentData {
  code?: string;
  name?: string;
  description?: string | null;
  status?: DepartmentStatus;
}

@Injectable()
export class DepartmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findFacility(organizationId: string, facilityId: string) {
    return this.prisma.facility.findFirst({
      where: {
        id: facilityId,
        organizationId,
      },

      select: {
        id: true,
        organizationId: true,
        name: true,
        status: true,
      },
    });
  }

  findByCode(facilityId: string, code: string) {
    return this.prisma.department.findFirst({
      where: {
        facilityId,
        code,
      },
    });
  }

  create(data: CreateDepartmentData) {
    return this.prisma.department.create({
      data,
    });
  }

  async findMany(
    organizationId: string,
    facilityId: string,
    options: {
      page: number;
      limit: number;
      search?: string;
      status?: DepartmentStatus;
    },
  ) {
    const skip = (options.page - 1) * options.limit;

    const search = options.search?.trim();

    const where: Prisma.DepartmentWhereInput = {
      organizationId,
      facilityId,

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
      this.prisma.department.findMany({
        where,
        skip,
        take: options.limit,

        orderBy: [
          {
            status: 'asc',
          },
          {
            name: 'asc',
          },
        ],
      }),

      this.prisma.department.count({
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

  findById(organizationId: string, facilityId: string, departmentId: string) {
    return this.prisma.department.findFirst({
      where: {
        id: departmentId,
        organizationId,
        facilityId,
      },
    });
  }

  update(departmentId: string, data: UpdateDepartmentData) {
    return this.prisma.department.update({
      where: {
        id: departmentId,
      },

      data,
    });
  }
}
